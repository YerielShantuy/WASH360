#include <WiFi.h>
#include <HTTPClient.h>
#include <WiFiClientSecure.h>
#include <ArduinoJson.h>

#define PUMP_RELAY 26
#define UV_RELAY 25

const char *ssid = "Yer";
const char *password = "yerielkeren";

const char *supabase_url = "https://gczdqvhncwqnafhebcja.supabase.co/rest/v1/relay_state?id=eq.1";
const char *anon_key = "sb_publishable_xA4swFAKNGXmeBaJN2fJ3g_qKsqIW0y";

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
  IPAddress gw = WiFi.gatewayIP();
  WiFi.config(WiFi.localIP(), gw, WiFi.subnetMask(), gw, gw);

  Serial.println("IP: " + WiFi.localIP().toString());
  Serial.println("DNS: " + gw.toString());
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

  WiFiClientSecure client;
  client.setInsecure();
  client.setTimeout(15000);

  HTTPClient http;
  http.setTimeout(15000);
  http.begin(client, supabase_url);
  http.addHeader("apikey", anon_key);
  http.addHeader("Authorization", String("Bearer ") + anon_key);

  int code = http.GET();
  Serial.print("HTTP code: ");
  Serial.println(code);

  if (code == 200)
  {
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
    Serial.println("Supabase: no response — " + String(code));
  }
  else
  {
    Serial.println("Unexpected code: " + String(code));
  }

  http.end();
  delay(500);
}
