package eduTechHackBackend;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.google.cloud.firestore.DocumentReference;
import com.google.cloud.firestore.Firestore;
import com.google.cloud.firestore.QueryDocumentSnapshot;
import com.google.cloud.firestore.QuerySnapshot;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.bind.annotation.CrossOrigin;


import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ExecutionException;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;

@CrossOrigin(origins = "http://localhost:63342")
@RestController
@RequestMapping("/api/chat")
public class ChatControllerPOSTGET {
    private final Firestore db;
    private final OpenAiService openAiService;
    @Autowired
    public ChatControllerPOSTGET(Firestore db, OpenAiService openAiService) {
        this.db = db;
        this.openAiService = openAiService;
    }
    @PostMapping("/processText")
    public Map<String, String> processMathProblem(@RequestBody Map<String, String> request) throws JsonProcessingException, ExecutionException, InterruptedException {
        System.out.println("🔥 processText() method was called!");

        if (request == null || request.isEmpty()) {
            System.out.println("❌ ERROR: Received an empty request body.");
            return Map.of("error", "Empty request body");
        }

        String user = request.get("user");
        String question = request.get("question");

        if (user == null || question == null) {
            System.out.println("ERROR: Missing user or question field!");
            return Map.of("error", "Missing user or question field");
        }

        String prompt = "Solve the following math problem step-by-step and don't box the final answer: " + question;
        String answer = openAiService.callGeminiAI(prompt);
        String extractedAnswer = extractAnswerFromResponse(answer);

        System.out.println("📝 Extracted Answer: " + extractedAnswer);
        System.out.println("🔍 Attempting to save chat to Firestore...");

        try {
            Map<String, Object> chatLog = new HashMap<>();
            chatLog.put("user", user);
            chatLog.put("question", question);
            chatLog.put("answer", extractedAnswer);
            chatLog.put("timestamp", System.currentTimeMillis());

            DocumentReference docRef = db.collection("chat_logs").document();
            docRef.set(chatLog).get();

            System.out.println("Successfully saved to Firestore: " + chatLog);
        } catch (Exception e) {
            System.err.println("Firestore Error: " + e.getMessage());
            e.printStackTrace();
            return Map.of("error", "Failed to save to Firestore");
        }

        return Map.of("response", extractedAnswer);
    }

    private String extractAnswerFromResponse(String aiResponse) throws JsonProcessingException {
        ObjectMapper objectMapper = new ObjectMapper();
        Map<String, Object> responseMap = objectMapper.readValue(aiResponse, Map.class);
        List<Map<String, Object>> candidates = (List<Map<String, Object>>) responseMap.get("candidates");
        if (candidates != null && !candidates.isEmpty()) {
            Map<String, Object> content = (Map<String, Object>) candidates.get(0).get("content");
            List<Map<String, Object>> parts = (List<Map<String, Object>>) content.get("parts");
            if (parts != null && !parts.isEmpty()) {
                String rawText = (String) parts.get(0).get("text");
                rawText = rawText.replaceAll(".\\n\\n{2,}", " ");
                rawText = rawText.replaceAll("\n", " ").trim();
                rawText = rawText.replaceAll("\\$\\\\boxed\\{.*?\\}\\$", "")
                        .replaceAll("\\\\boxed\\{.*?\\}", "")
                        .replaceAll("\\$\\\\boxed\\{(.*?)\\}\\$", "")
                        .replaceAll("\\\\\boxed\\{(.*?)\\}","")
                        .replaceAll("\\$\\\\boxed\\{(\\d{1,3})\\}\\$", "")
                        .replaceAll("\\\\boxed\\{(\\d{1,3})\\}", "")
                        .trim();
                return rawText;
            }
        }
        return "Error extracting answer";
    }
    @PostMapping("/save")
    public String saveChat(@RequestBody Map<String, String> chat) throws ExecutionException, InterruptedException{
        String user = chat.get("user");
        String question = chat.get("question");

        if(user == null || question == null){
            return "Missing necessary information";
        }

        String prompt = "Explain step-by-step how to solve the following problem: " + question;
        String answer = openAiService.callGeminiAI(prompt);

        Map<String, Object> chatLog = new HashMap<>();
        chatLog.put("user", user);
        chatLog.put("question", question);
        chatLog.put("answer", answer);
        chatLog.put("timestamp", System.currentTimeMillis());

        DocumentReference docRef = db.collection("chat_logs").document();
        docRef.set(chatLog).get();
        return "Chat Logged Successfully!!";
    }

    @GetMapping("/logs")
    public List<Map<String, Object>> getChatLogs() throws ExecutionException, InterruptedException{
        QuerySnapshot logs = db.collection("chat_logs").get().get();
        List<Map<String, Object>> chatLogs = new ArrayList<>();
        for(QueryDocumentSnapshot doc : logs){
            chatLogs.add(doc.getData());
        }
        return chatLogs;
    }

    @GetMapping("/logs/{user}")
    public List<Map<String, Object>> getUserChatLogs(@PathVariable String user) throws ExecutionException, InterruptedException{
        QuerySnapshot logs = db.collection("chat_logs").whereEqualTo("user", user).get().get();
        List<Map<String, Object>> chatLogs = new ArrayList<>();
        for (QueryDocumentSnapshot doc : logs) {
            chatLogs.add(doc.getData());
        }
        return chatLogs;
    }

    @GetMapping("/test")
    public String testAPI() {
        return "Spring Boot Chat API is running!";
    }
    
}
