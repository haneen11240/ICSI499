package eduTechHackBackend;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

@Service
public class OpenAiService {
    // Load the API key from environment variables or application.properties
    @Value("${gemini.api.key:#{null}}")
    public String apiKey;


    private final RestTemplate restTemplate = new RestTemplate();
    public String callGeminiAI(String prompt) {
        String url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=AIzaSyDZccyHqvslWONW5rOzx8s694J72GcqeJk";

        // Set HTTP headers including the API key for authentication
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);

        // Build the JSON request payload
        String requestBody = "{"
                + "\"contents\": [{\"parts\": [{\"text\": \"" + escapeJson(prompt) + "\"}]}]"
                + "}";

        HttpEntity<String> request = new HttpEntity<>(requestBody, headers);

        // Execute the POST request and return the response as a String
        String response = restTemplate.postForObject(url, request, String.class);
        return response;
    }

    // Simple utility method to escape quotes in the prompt
    private String escapeJson(String input) {
        return input.replace("\"", "\\\"");
    }
}