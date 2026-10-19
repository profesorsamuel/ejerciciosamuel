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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers });
  if (req.method !== "POST") return responder({ error: "Metodo no permitido" }, 405);

  try {
    const url = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_PUBLISHABLE_KEY");
    const geminiKey = Deno.env.get("GEMINI_API_KEY");

    if (!url || !anonKey || !geminiKey) {
      return responder({ error: "Falta configuracion del servidor" }, 500);
    }

    const token = req.headers.get("Authorization");
    if (!token?.startsWith("Bearer ")) {
      return responder({ error: "Inicie sesion" }, 401);
    }

    // Enviar el JWT del docente en las consultas para que RLS reconozca auth.uid().
    const supabase = createClient(url, anonKey, {
      global: { headers: { Authorization: token } },
    });

    const { data: auth, error: authError } = await supabase.auth.getUser(token.slice(7));
    if (authError || !auth.user) return responder({ error: "Sesion no valida" }, 401);

    const { data: docente, error: docenteError } = await supabase
      .from("cia_docentes")
      .select("id")
      .eq("id", auth.user.id)
      .maybeSingle();

    if (docenteError) {
      console.error("Error consultando cia_docentes:", docenteError.message);
      return responder({ error: "No se pudo verificar el acceso docente" }, 403);
    }
    if (!docente) return responder({ error: "Acceso reservado a docentes" }, 403);

    const body = await req.json();
    const texto = String(body.texto || "").trim();
    const tema = String(body.tema || "Ciencias Naturales").slice(0, 150);
    const grado = String(body.grado || "9").slice(0, 20);
    const cantidad = Math.min(80, Math.max(5, Number(body.cantidad) || 20));
    const permitidas = ["seleccion_multiple", "verdadero_falso", "completar", "relacionar", "ordenar", "caso", "detective", "quien", "causa", "mito", "casos"];
    const tecnicas = Array.isArray(body.tecnicas) ? body.tecnicas.filter((t: unknown) => typeof t === "string" && permitidas.includes(t)) : ["seleccion_multiple"];
    if (!tecnicas.length) return responder({ error: "Seleccione al menos una técnica" }, 400);

    if (texto.length < 100) return responder({ error: "El PDF no contiene suficiente texto" }, 400);
    if (texto.length > 100000) return responder({ error: "Documento demasiado extenso" }, 413);

    const instrucciones = `
Eres un docente experto en elaborar evaluaciones escolares de distintas materias.
MATERIA: ${String(body.materia || "Ciencias Naturales").slice(0,100)}
TEMA: ${tema}
GRADO: ${grado}
CANTIDAD: ${cantidad}
Genera EXACTAMENTE ${cantidad} preguntas educativas basadas exclusivamente en el texto, siempre que el contenido lo permita. Para técnicas del Enlace 2, cada pregunta debe tener exactamente tres alternativas distintas y una respuesta literal incluida en ellas.
No inventes informacion. Lenguaje apropiado para el grado. Mezcla niveles facil, medio y dificil.
REGLA OBLIGATORIA: SOLO puedes utilizar los identificadores JSON siguientes para el campo tipo: ${tecnicas.map(t=>`"${t}"`).join(", ")}. Quedan PROHIBIDOS "seleccion_multiple", "verdadero_falso" y cualquier otro identificador que NO esté en esta lista. Reparte equitativamente las preguntas entre los tipos autorizados.
Cada pregunta debe tener un enunciado autónomo, una respuesta verificable y una explicación.
Para selección múltiple, caso, detective, quien, causa, mito y casos, da exactamente 3 opciones DISTINTAS y una respuesta idéntica a una opción. Para las cinco técnicas del Enlace 2 nunca devuelvas solo dos opciones.
Para detective, identifica un error conceptual y pregunta cómo corregirlo.
Para quien, plantea pistas para reconocer un concepto.
Para causa, pide identificar una causa o consecuencia.
Para mito, evalúa una afirmación científica con tres explicaciones alternativas.
Para casos, plantea una situación práctica basada en el PDF.
Para verdadero_falso, usa opciones ["Verdadero", "Falso"] y respuesta exacta.
Para completar, ofrece cuatro alternativas de palabras y una respuesta exacta.
Para relacionar, plantea una relación única de concepto y definición con cuatro opciones de respuesta.
Para ordenar, formula una pregunta sobre el paso que corresponde en una secuencia, con cuatro opciones.
No inventes secuencias ni relaciones si el PDF no las permite.
Devuelve siempre las opciones como cadenas, y la respuesta como una de ellas.
Evita preguntas repetidas, opciones duplicadas y respuestas ausentes de opciones. Cada pregunta debe tener respuesta correcta y explicacion breve. Si seleccionan exclusivamente técnicas del Enlace 2, usa solamente esos tipos.
Si no hay contenido suficiente, genera menos preguntas.
Devuelve exclusivamente JSON valido con esta forma:
{
  "preguntas": [
    {
      "tipo": "${tecnicas[0]}",
      "pregunta": "Texto de la pregunta",
      "opciones": ["Opcion A", "Opcion B", "Opcion C"],
      "respuesta": "Opcion A",
      "explicacion": "Explicacion breve",
      "dificultad": "facil"
    }
  ]
}
Tipos permitidos: ${tecnicas.join(", ")}. No uses otros tipos.
Dificultades: facil, medio, dificil.
CONTENIDO DEL PDF:
${texto}`;

    const respuesta = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent",
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": geminiKey },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: instrucciones }] }],
          generationConfig: {
            responseMimeType: "application/json",
            // El esquema obliga a Gemini a usar solo las técnicas pedidas y 3 opciones.
            responseSchema: {
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
            },
            temperature: 0.3,
            maxOutputTokens: 16000,
          },
        }),
      },
    );

    if (!respuesta.ok) {
      console.error("Gemini:", respuesta.status, await respuesta.text());
      return responder({ error: "No se pudieron generar preguntas", codigo: respuesta.status }, 502);
    }

    const resultado = await respuesta.json();
    const contenido = resultado.candidates?.[0]?.content?.parts
      ?.map((p: { text?: string }) => p.text || "").join("") || "";

    if (!contenido) return responder({ error: "Gemini no devolvio preguntas" }, 502);

    let datos;
    try { datos = JSON.parse(contenido); }
    catch { return responder({ error: "Gemini devolvio una respuesta incompleta" }, 502); }

    if (!Array.isArray(datos.preguntas)) {
      return responder({ error: "Formato de preguntas incorrecto" }, 502);
    }

    const tiposRecibidos = [...new Set(datos.preguntas.map((p: Record<string, unknown>) => String(p?.tipo)))];
    console.log("Gemini devolvió", datos.preguntas.length, "preguntas; tipos:", tiposRecibidos.join(","));
    const preguntas = datos.preguntas.filter((p: Record<string, unknown>) =>
      tecnicas.includes(String(p.tipo)) &&
      typeof p.pregunta === "string" &&
      typeof p.respuesta === "string" &&
      Array.isArray(p.opciones) && p.opciones.length >= (tecnicas.some(t => ["detective","quien","causa","mito","casos"].includes(t)) ? 3 : 2) &&
      p.opciones.every((o: unknown) => typeof o === "string") &&
      p.opciones.includes(p.respuesta) &&
      typeof p.explicacion === "string"
    ).slice(0, cantidad);

    return responder({
      correcto: true, tema, grado, cantidad: preguntas.length, preguntas, crudas: datos.preguntas.length, tiposRecibidos,
      mensaje: "Preguntas generadas para revision",
    });
  } catch (error) {
    console.error("cia-generar:", error);
    return responder({ error: "Error interno al generar preguntas" }, 500);
  }
});
