import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

function responder(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers });
}

type ModeloGemini = { name?: string; supportedGenerationMethods?: string[] };

const TECNICAS_VALIDAS = ["detective", "quien", "causa", "mito", "casos"];

async function buscarModelos(apiKey: string): Promise<string[]> {
  const encontrados: string[] = [];
  let pagina: string | undefined;
  let contador = 0;

  do {
    const endpoint = new URL("https://generativelanguage.googleapis.com/v1beta/models");
    endpoint.searchParams.set("pageSize", "100");
    if (pagina) endpoint.searchParams.set("pageToken", pagina);

    const respuesta = await fetch(endpoint.toString(), {
      headers: { "x-goog-api-key": apiKey },
    });

    if (!respuesta.ok) {
      console.error("Error al consultar modelos:", respuesta.status, await respuesta.text());
      throw new Error(`No se pudieron consultar los modelos (${respuesta.status})`);
    }

    const datos = await respuesta.json();
    const modelos: ModeloGemini[] = datos.models || [];
    for (const m of modelos) {
      if (m.name && m.supportedGenerationMethods?.includes("generateContent")) {
        encontrados.push(m.name);
      }
    }
    pagina = datos.nextPageToken;
    contador++;
  } while (pagina && contador < 10);

  const preferidos = [
    "models/gemini-3.5-flash-lite",
    "models/gemini-3-flash",
    "models/gemini-3.1-flash-lite",
    "models/gemini-2.5-flash",
  ];
  const descartados = ["gemini-2.5-flash-lite", "gemini-2.0-flash"];

  const permitidos = encontrados.filter((n) =>
    n.includes("flash") &&
    !n.includes("image") && !n.includes("preview") && !n.includes("live") && !n.includes("audio") &&
    !descartados.some((x) => n.includes(x))
  );

  return [...new Set([...preferidos.filter((x) => permitidos.includes(x)), ...permitidos])];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers });
  if (req.method !== "POST") return responder({ error: "Método no permitido" }, 405);

  try {
    const url = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_PUBLISHABLE_KEY");
    const geminiKey = Deno.env.get("GEMINI_API_KEY");
    if (!url || !anonKey || !geminiKey) {
      return responder({ error: "Falta configuración del servidor" }, 500);
    }

    // VERIFICAR SESIÓN
    const token = req.headers.get("Authorization");
    if (!token?.startsWith("Bearer ")) return responder({ error: "Debe iniciar sesión" }, 401);
    const jwt = token.slice(7);

    const supabase = createClient(url, anonKey, {
      global: { headers: { Authorization: `Bearer ${jwt}` } },
    });

    const { data: auth, error: authError } = await supabase.auth.getUser(jwt);
    if (authError || !auth.user) return responder({ error: "Sesión no válida" }, 401);

    // VERIFICAR DOCENTE
    const { data: docente, error: docenteError } = await supabase
      .from("cia_docentes").select("id").eq("id", auth.user.id).maybeSingle();
    if (docenteError) {
      console.error("Verificación de docente:", docenteError.message);
      return responder({ error: "No se pudieron verificar los permisos" }, 403);
    }
    if (!docente) return responder({ error: "Acceso reservado a docentes" }, 403);

    // DATOS DE LA SOLICITUD
    let body: Record<string, unknown>;
    try { body = await req.json(); }
    catch { return responder({ error: "Solicitud JSON incorrecta" }, 400); }

    const texto = String(body.texto || "").trim();
    const tema = String(body.tema || "Ciencias Naturales").slice(0, 150);
    const grado = String(body.grado || "9").slice(0, 20);
    const materia = String(body.materia || "Ciencias Naturales").slice(0, 100);
    const numero = Number(body.cantidad);
    const cantidad = Math.min(80, Math.max(5, Number.isFinite(numero) ? Math.floor(numero) : 20));

    const tecnicas: string[] = Array.isArray(body.tecnicas)
      ? body.tecnicas.filter((t: unknown) => typeof t === "string" && TECNICAS_VALIDAS.includes(t))
      : [];
    if (!tecnicas.length) return responder({ error: "Seleccione al menos una técnica" }, 400);

    // Preguntas que ya existen: Gemini debe evitarlas.
    const evitar: string[] = Array.isArray(body.evitar)
      ? body.evitar.filter((x: unknown) => typeof x === "string").slice(-40).map((x: string) => x.slice(0, 160))
      : [];

    if (texto.length < 100) return responder({ error: "El PDF no contiene suficiente texto" }, 400);
    if (texto.length > 100000) return responder({ error: "El documento es demasiado extenso" }, 413);

    const bloqueEvitar = evitar.length
      ? `\nYA EXISTEN estas preguntas. NO las repitas ni hagas variantes casi iguales; cubre otros aspectos del texto:\n${evitar.map((x) => "- " + x).join("\n")}\n`
      : "";

    const instrucciones = `
Eres un docente experto en elaborar evaluaciones escolares.
MATERIA: ${materia}
TEMA: ${tema}
GRADO: ${grado}
CANTIDAD: ${cantidad}

Genera hasta ${cantidad} preguntas basadas exclusivamente en el texto del PDF. No inventes información ni uses información externa. Lenguaje apropiado para el grado. Mezcla dificultad facil, medio y dificil. Evita preguntas repetidas y cubre distintas partes del texto.
${bloqueEvitar}
SOLO puedes usar estos valores en el campo "tipo": ${tecnicas.map((t) => `"${t}"`).join(", ")}.
Reparte las preguntas equitativamente entre esos tipos. Está PROHIBIDO usar otro tipo (por ejemplo seleccion_multiple, verdadero_falso o completar).

TODAS las preguntas deben tener EXACTAMENTE 3 opciones distintas, y "respuesta" debe ser idéntica a una de las 3 opciones. Incluye una explicación breve. Los distractores deben ser plausibles pero claramente incorrectos según el texto.

Guía por tipo:
- detective: presenta un error conceptual y pregunta cómo corregirlo.
- quien: da pistas para reconocer un concepto ("¿Quién soy?").
- causa: pide identificar una causa o una consecuencia.
- mito: presenta una afirmación y pregunta cuál explicación científica es correcta.
- casos: plantea una situación práctica basada en el PDF.

Si no hay contenido suficiente, genera menos preguntas.
Devuelve exclusivamente JSON válido con esta forma:
{"preguntas":[{"tipo":"${tecnicas[0]}","pregunta":"...","opciones":["A","B","C"],"respuesta":"A","explicacion":"...","dificultad":"facil"}]}

CONTENIDO DEL PDF:
${texto}
`;

    // BUSCAR MODELOS
    let modelos: string[];
    try { modelos = await buscarModelos(geminiKey); }
    catch (error) {
      console.error("Modelos Gemini:", error);
      return responder({ error: "No se pudo consultar la API de Gemini" }, 502);
    }
    if (modelos.length === 0) return responder({ error: "No hay modelos compatibles disponibles" }, 502);
    console.info("Modelos disponibles:", modelos);

    const esquema = {
      type: "OBJECT",
      properties: {
        preguntas: {
          type: "ARRAY",
          items: {
            type: "OBJECT",
            properties: {
              tipo: { type: "STRING", enum: tecnicas },
              pregunta: { type: "STRING" },
              opciones: { type: "ARRAY", items: { type: "STRING" }, minItems: 3, maxItems: 3 },
              respuesta: { type: "STRING" },
              explicacion: { type: "STRING" },
              dificultad: { type: "STRING", enum: ["facil", "medio", "dificil"] },
            },
            required: ["tipo", "pregunta", "opciones", "respuesta", "explicacion"],
          },
        },
      },
      required: ["preguntas"],
    };

    // INTENTAR GENERACIÓN
    let respuestaGemini: Response | null = null;
    let modeloUsado = "";
    let ultimoCodigo = 0;

    for (const modelo of modelos) {
      console.info("Probando modelo:", modelo);
      let respuesta: Response;
      try {
        respuesta = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/${modelo}:generateContent`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json", "x-goog-api-key": geminiKey },
            body: JSON.stringify({
              contents: [{ role: "user", parts: [{ text: instrucciones }] }],
              generationConfig: {
                responseMimeType: "application/json",
                responseSchema: esquema,
                temperature: 0.4,
                maxOutputTokens: 16000,
              },
            }),
          },
        );
      } catch (error) {
        console.error("Error de conexión con Gemini:", error);
        return responder({ error: "No se pudo conectar con Gemini" }, 502);
      }

      if (respuesta.ok) { respuestaGemini = respuesta; modeloUsado = modelo; break; }

      ultimoCodigo = respuesta.status;
      console.error("Error Gemini:", respuesta.status, modelo, (await respuesta.text()).slice(0, 2000));

      if ([400, 403, 404].includes(respuesta.status)) continue;
      if (respuesta.status === 429) {
        return responder({ error: "Se alcanzó el límite gratuito de solicitudes de Gemini. Espere un minuto e intente de nuevo.", codigo: 429, modelo }, 502);
      }
      return responder({ error: "Gemini no pudo generar las preguntas", codigo: respuesta.status, modelo }, 502);
    }

    if (!respuestaGemini) {
      return responder({
        error: "Ninguno de los modelos disponibles pudo generar preguntas",
        codigo: ultimoCodigo,
        modelosIntentados: modelos,
      }, 502);
    }

    // LEER RESULTADO
    const resultado = await respuestaGemini.json();
    const contenido = resultado.candidates?.[0]?.content?.parts
      ?.map((p: { text?: string }) => p.text || "").join("") || "";

    if (!contenido) {
      console.error("Respuesta vacía:", JSON.stringify(resultado).slice(0, 1500));
      return responder({ error: "Gemini no devolvió contenido", modelo: modeloUsado }, 502);
    }

    let datos: { preguntas?: unknown };
    try { datos = JSON.parse(contenido); }
    catch {
      console.error("JSON incompleto:", contenido.slice(0, 500));
      return responder({ error: "Gemini devolvió JSON incompleto", modelo: modeloUsado }, 502);
    }

    if (!datos || !Array.isArray(datos.preguntas)) {
      return responder({ error: "Formato de preguntas incorrecto" }, 502);
    }

    const crudas = datos.preguntas as Record<string, unknown>[];
    const tiposRecibidos = [...new Set(crudas.map((p) => String(p?.tipo)))];
    console.info("Gemini devolvió", crudas.length, "preguntas; tipos:", tiposRecibidos.join(","), "modelo:", modeloUsado);

    // VALIDAR
    const preguntas = crudas.filter((p) => {
      if (!p || typeof p !== "object") return false;
      const ops = p.opciones;
      return (
        tecnicas.includes(String(p.tipo)) &&
        typeof p.pregunta === "string" && p.pregunta.trim().length > 0 &&
        typeof p.respuesta === "string" &&
        typeof p.explicacion === "string" &&
        Array.isArray(ops) && ops.length >= 3 &&
        ops.every((o: unknown) => typeof o === "string") &&
        new Set(ops as string[]).size === ops.length &&
        (ops as string[]).includes(p.respuesta as string)
      );
    }).slice(0, cantidad);

    if (preguntas.length === 0) {
      return responder({ error: "No se generaron preguntas válidas", crudas: crudas.length, tiposRecibidos }, 502);
    }

    return responder({
      correcto: true, tema, grado,
      cantidad: preguntas.length,
      preguntas,
      crudas: crudas.length,
      tiposRecibidos,
      modelo: modeloUsado,
      mensaje: "Preguntas generadas para revisión",
    });
  } catch (error) {
    console.error("cia-generar:", error);
    return responder({ error: "Error interno al generar preguntas" }, 500);
  }
});
