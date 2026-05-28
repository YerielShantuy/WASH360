#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

#define PUMP_RELAY  13
#define UV_RELAY    12

const char* ssid     = "Yer";
const char* password = "yerielkeren";

const char* supabase_url = "https://gczdqvhncwqnafhebcja.supabase.co/rest/v1/relay_state?id=eq.1";
const char* anon_key     = "YOUR_ANON_KEY";

void setup() {
  Serial.begin(115200);
  pinMode(PUMP_RELAY, OUTPUT); digitalWrite(PUMP_RELAY, HIGH);
  pinMode(UV_RELAY,   OUTPUT); digitalWrite(UV_RELAY,   HIGH);

  Serial.print("Connecting to WiFi");
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) { delay(500); Serial.print("."); }
  Serial.println("\nConnected: " + WiFi.localIP().toString());
}

void loop() {
  if (WiFi.status() != WL_CONNECTED) {
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
  Serial.print("HTTP: "); Serial.println(code);

  if (code == 200) {
    String body = http.getString();
    Serial.println("Body: " + body);

    StaticJsonDocument<256> doc;
    DeserializationError err = deserializeJson(doc, body);
    if (err) {
      Serial.println("JSON error: " + String(err.c_str()));
    } else {
      bool pump = doc[0]["pump"];
      bool uv   = doc[0]["uv"];
      Serial.print("pump="); Serial.print(pump);
      Serial.print(" uv=");  Serial.println(uv);
      digitalWrite(PUMP_RELAY, pump ? LOW : HIGH);
      digitalWrite(UV_RELAY,   uv   ? LOW : HIGH);
    }
  } else {
    Serial.println("Error body: " + http.getString());
  }

  http.end();
  delay(500);
}