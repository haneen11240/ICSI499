import com.sun.net.httpserver.HttpServer;
import com.sun.net.httpserver.HttpExchange;
import java.net.InetSocketAddress;
import java.io.*;
import java.util.stream.Collectors;
import java.time.Duration;

import org.openqa.selenium.By;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.WebElement;
import org.openqa.selenium.chrome.ChromeDriver;
import org.openqa.selenium.chrome.ChromeOptions;
import org.openqa.selenium.support.ui.ExpectedConditions;
import org.openqa.selenium.support.ui.WebDriverWait;
import com.sun.net.httpserver.HttpServer;
import com.sun.net.httpserver.HttpExchange;

public class BotJoinServer {

    private static WebDriver botDriver = null;
    public static void main(String[] args) throws IOException {
        HttpServer server = HttpServer.create(new InetSocketAddress(8080), 0);
        System.setProperty("webdriver.chrome.driver", "C:\\Users\\Enea\\Documents\\TestFor499\\chromedriver\\chromedriver.exe");

        server.createContext("/join", exchange -> {
            String requestMethod = exchange.getRequestMethod();
        
            if ("OPTIONS".equalsIgnoreCase(requestMethod)) {
                // Add headers BEFORE sending response
                exchange.getResponseHeaders().add("Access-Control-Allow-Origin", "*");
                exchange.getResponseHeaders().add("Access-Control-Allow-Methods", "POST, OPTIONS");
                exchange.getResponseHeaders().add("Access-Control-Allow-Headers", "Content-Type");
                exchange.sendResponseHeaders(204, -1); // No Content
                return;
            }
        
            if ("POST".equalsIgnoreCase(requestMethod)) {
                // Add CORS headers FIRST
                exchange.getResponseHeaders().add("Access-Control-Allow-Origin", "*");
                exchange.getResponseHeaders().add("Access-Control-Allow-Headers", "Content-Type");
        
                InputStream is = exchange.getRequestBody();
                String body = new BufferedReader(new InputStreamReader(is))
                        .lines()
                        .collect(Collectors.joining("\n"));
        
                System.out.println("Received body: " + body);
                String meetUrl = extractUrlFromJson(body);
                System.out.println("Join request for: " + meetUrl);
        
                //Launch the bot
                try {
                    ProcessBuilder pb = new ProcessBuilder(
                        "java",
                        "-cp",
                        ".;../libs/selenium-server-4.30.0.jar",
                        "GoogleMeetBotAI",
                        meetUrl
                    );
                    pb.inheritIO();
                    pb.start();
                } catch (Exception e) {
                    System.out.println("Failed to launch bot");
                    e.printStackTrace();
                }
        
                String response = "TechBot launched";
                exchange.sendResponseHeaders(200, response.getBytes().length);
                OutputStream os = exchange.getResponseBody();
                os.write(response.getBytes());
                os.close();
            } else {
                exchange.sendResponseHeaders(405, -1); // method failed
            }
        });
        
        server.createContext("/remove", exchange ->{
            System.out.println("Removing Ora");
            if("POST".equals(exchange.getRequestMethod())){
                System.out.println("Remove request recieved");
                if (botDriver != null){
                    try{
                        WebDriverWait wait = new WebDriverWait(botDriver, Duration.ofSeconds(2));
                        WebElement leaveButton = wait.until(ExpectedConditions.elementToBeClickable(By.xpath("//div[@aria-label='Leave call']")));

                        leaveButton.click();
                        System.out.println("Ora sucessfully left");
                        botDriver.quit();
                    }catch(Exception e){
                        System.out.println("Ora leave failed: " + e);
                    }
                }
            }
        });

        server.setExecutor(null);
        server.start();
        System.out.println("BotJoinServer is running on http://localhost:8080");
    }

    private static String extractUrlFromJson(String json) {
        // JSON parser (expects {"url": "https://meet.google.com/..."})
        String prefix = "\"url\":\"";
        int start = json.indexOf(prefix) + prefix.length();
        int end = json.indexOf("\"", start);
        return json.substring(start, end);
    }
}