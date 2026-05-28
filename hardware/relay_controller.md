#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

#define PUMP_RELAY 25
#define UV_RELAY 26

const char *ssid = "Yer";
const char *password = "yerielkeren";

const char *supabase_url = "https://gczdqvhncwqnafhebcja.supabase.co/rest/v1/relay_state?id=eq.1";
const char *anon_key = "spb_publishable_xA4swFAKNGXmeBaJN2fJ3g_qKsqIW0y";

void setup()
{
  Serial.begin(115200);
  pinMode(PUMP_RELAY, OUTPUT);
  digitalWrite(PUMP_RELAY, HIGH);
  pinMode(UV_RELAY, OUTPUT);
  digitalWrite(UV_RELAY, HIGH);

  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED)
  {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nConnected!");

  // httpbin.org IP — bypasses DNS completely
  HTTPClient http;
  http.begin("http://44.126.249.42/get"); // hardcoded IP
  http.addHeader("Host", "httpbin.org");  // required for the server to route correctly
  int code = http.GET();
  Serial.println("HTTP code: " + String(code));

  // Verify
  IPAddress ip;
  if (WiFi.hostByName("httpbin.org", ip) && ip != IPAddress(0, 0, 0, 0))
  {
    Serial.println("DNS OK: " + ip.toString());
  }
  else
  {
    Serial.println("DNS still failing — trying HTTP by IP");
  }
}

void loop()
{
  if (WiFi.status() != WL_CONNECTED)
  {
    Serial.println("WiFi lost, reconnecting...");
    WiFi.reconnect();
    delay(1000);
    return;
  }

  HTTPClient http;
  http.begin(supabase_url);
  http.addHeader("apikey", anon_key);
  http.addHeader("Authorization", String("Bearer ") + anon_key);

  int code = http.GET();
  Serial.print("HTTP code: ");
  Serial.println(code);

  if (code == 200)
  {
    Serial.println("Supabase: connected");
    String body = http.getString();
    Serial.println("Body: " + body);

    StaticJsonDocument<256> doc;
    DeserializationError err = deserializeJson(doc, body);
    if (err)
    {
      Serial.println("JSON error: " + String(err.c_str()));
    }
    else
    {
      bool pump = doc[0]["pump"];
      bool uv = doc[0]["uv"];
      Serial.print("pump=");
      Serial.print(pump);
      Serial.print(" uv=");
      Serial.println(uv);
      digitalWrite(PUMP_RELAY, pump ? LOW : HIGH);
      digitalWrite(UV_RELAY, uv ? LOW : HIGH);
    }
  }
  else if (code == 401)
  {
    Serial.println("Supabase: wrong API key");
  }
  else if (code == 404)
  {
    Serial.println("Supabase: table not found / wrong URL");
  }
  else if (code < 0)
  {
    Serial.println("Supabase: no response — check URL or internet");
    Serial.println("Error: " + http.getString());
  }
  else
  {
    Serial.println("Supabase: unexpected code " + String(code));
    Serial.println("Body: " + http.getString());
  }

  http.end();
  delay(500);
}
