#include <Arduino.h>
#include "WiFi.h"
#include "ESPAsyncWebServer.h"
#include <TFT_eSPI.h>
#include <SPI.h>
#include <iostream>
#include <string>

TFT_eSPI tft = TFT_eSPI();

// const char *ssid = "desenvolvimento";
// const char *password = "11223344";

const char *ssid = "TC-CORPORATIVO";
const char *password = "";

AsyncWebServer server(80);

String mac;
String parametro;
String id_number;

int status = 0;
int batery = 0;
int buzzer = 27;

void TelaInfo()
{
  tft.setRotation(1);
    if(status == 10 || status == 32) {
    tft.fillScreen(TFT_RED);
  } else if (status == 11 || status == 33)
  {
    tft.fillScreen(TFT_BLUE );
  } else {
    tft.fillScreen(TFT_WHITE  ); 
  }
  tft.setTextColor(TFT_WHITE, TFT_WHITE);

  tft.setTextSize(3);
  tft.setCursor(5, 5);
  tft.println("IP:");

  tft.setTextSize(2);
  tft.setCursor(5, 35);
  tft.println(WiFi.localIP());

  tft.setCursor(5, 70);
  tft.setTextSize(3);
  tft.println("MAC:");

  tft.setCursor(5, 100);
  tft.setTextSize(2);
  tft.println(WiFi.macAddress());

};

void setup()
{
  Serial.begin(115200);
  tft.begin();
  tft.setRotation(4); // Landscape

  //Define pin
  pinMode(buzzer, OUTPUT);

  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED)
  {
    delay(1000);
    Serial.println("Connecting to WiFi..");
  }

  mac = WiFi.macAddress();
  Serial.println(WiFi.localIP());
  Serial.println(WiFi.macAddress());

  server.on("/checagem", HTTP_GET, [](AsyncWebServerRequest *request)
            { request->send_P(200, "text/plain", mac.c_str()); });
  server.on("/setpoint", HTTP_POST, [](AsyncWebServerRequest *request)
            {
    int params = request->params();
    for(int i = 0; i < params; i++){
      AsyncWebParameter* p = request->getParam(i);
      id_number = p->name().c_str();
      parametro = p->value().c_str();

      if(id_number == "status"){
        status = atoi(parametro.c_str());
        Serial.println("status: ");
        Serial.println(parametro);
      }
      if(id_number == "batery"){
        batery = atoi(parametro.c_str());
        Serial.println("Batery: ");
        Serial.println(parametro);
      }
    }request->send(200, "text/plain", "Success, setpoint"); });
 
  DefaultHeaders::Instance().addHeader("Access-Control-Allow-Origin", "*");
  server.begin();
}

void loop()
{
  if(status == 10 || status == 32) {
    tft.fillScreen(TFT_RED);
  } else if (status == 11 || status == 33)
  {
    tft.fillScreen(TFT_YELLOW);
  } else {
    tft.fillScreen(TFT_WHITE  ); 
  }
  delay(1000);
}
