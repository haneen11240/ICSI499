import com.sun.net.httpserver.HttpServer;
import com.sun.net.httpserver.HttpExchange;
import java.net.InetSocketAddress;
import java.io.*;
import java.util.stream.Collectors;

public class BotJoinServer {
    public static void main(String[] args) throws IOException {
        HttpServer server = HttpServer.create(new InetSocketAddress(8080), 0);

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
                exchange.sendResponseHeaders(405, -1); // Method Not Allowed
            }
        });        

        server.setExecutor(null);
        server.start();
        System.out.println("BotJoinServer is running on http://localhost:8080");
    }

    private static String extractUrlFromJson(String json) {
        // Very simple JSON parser (expects {"url": "https://meet.google.com/..."})
        String prefix = "\"url\":\"";
        int start = json.indexOf(prefix) + prefix.length();
        int end = json.indexOf("\"", start);
        return json.substring(start, end);
    }
}