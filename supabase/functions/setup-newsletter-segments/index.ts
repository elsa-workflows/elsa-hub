const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SEGMENTS_TO_CREATE = [
  "cloud-services",
  "training",
];

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY not configured");
    }

    const results: { name: string; id?: string; error?: string }[] = [];

    for (const name of SEGMENTS_TO_CREATE) {
      try {
        // Rate limit: wait 1 second between requests
        await sleep(1000);
        
        const response = await fetch("https://api.resend.com/audiences", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${RESEND_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ name }),
        });

        const data = await response.json();

        if (!response.ok) {
          results.push({ name, error: data.message || JSON.stringify(data) });
        } else {
          results.push({ name, id: data.id });
        }
      } catch (err) {
        results.push({ name, error: String(err) });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        segments: results,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Error:", message);
    return new Response(
      JSON.stringify({ error: message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
