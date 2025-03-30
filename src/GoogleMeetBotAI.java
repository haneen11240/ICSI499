import org.openqa.selenium.By;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.WebElement;
import org.openqa.selenium.chrome.ChromeDriver;
import org.openqa.selenium.chrome.ChromeOptions;
import org.openqa.selenium.support.ui.ExpectedConditions;
import org.openqa.selenium.support.ui.WebDriverWait;
import java.time.Duration;
import java.util.Scanner;
import java.util.Map;
import java.util.HashMap;

public class GoogleMeetBotAI {
    public static void main(String[] args) throws InterruptedException {
        System.setProperty("webdriver.chrome.driver", "C:\\Users\\Enea\\Documents\\TestFor499\\chromedriver\\chromedriver.exe");

        ChromeOptions options = new ChromeOptions();
        options.addArguments("user-data-dir=C:\\Users\\Enea\\Documents\\ICSI499\\bot-profile");
        options.addArguments("--no-sandbox");
        
        Map<String, Object> prefs = new HashMap<>();
        prefs.put("profile.default_content_setting_values.media_stream_mic", 2);
        prefs.put("profile.default_content_setting_values.media_stream_camera", 2);       
        options.setExperimentalOption("prefs", prefs);
        WebDriver driver = new ChromeDriver(options);
        
        if (args.length < 1) {
            System.out.println("No Meet URL provided.");
            return;
        }

        String meetUrl = args[0];
        driver.get(meetUrl);

        WebDriverWait wait = new WebDriverWait(driver, Duration.ofSeconds(20));

        try {
            // 👤 Enter guest name (if required)
            try {
                WebDriverWait nameWait = new WebDriverWait(driver, Duration.ofSeconds(5));
                WebElement nameInput = nameWait.until(ExpectedConditions.visibilityOfElementLocated(
                    By.xpath("//input[@aria-label='Your name']")));
                nameInput.clear();
                nameInput.sendKeys("TechBot");
                System.out.println("Entered guest name: TechBot");
            } catch (Exception e) {
                System.out.println("No name field found — skipping.");
            }

            // 🎤 Turn off mic
            try {
                WebElement micButton = wait.until(ExpectedConditions.elementToBeClickable(
                    By.xpath("//div[@aria-label='Turn off microphone']")));
                micButton.click();
                System.out.println("Mic turned off.");
            } catch (Exception e) {
                System.out.println("Mic already off or not found.");
            }

            // 📷 Turn off cam
            try {
                WebElement cameraButton = wait.until(ExpectedConditions.elementToBeClickable(
                    By.xpath("//div[@aria-label='Turn off camera']")));
                cameraButton.click();
                System.out.println("Camera turned off.");
            } catch (Exception e) {
                System.out.println("Camera already off or not found.");
            }

            // 🙋 Click join/ask button
            try {
                WebElement askButton = wait.until(ExpectedConditions.elementToBeClickable(
                    By.xpath("//span[contains(text(), 'Ask to join')]")));
                askButton.click();
                System.out.println("Bot clicked 'Ask to join'");
            } catch (Exception ex1) {
                try {
                    WebElement joinNowButton = wait.until(ExpectedConditions.elementToBeClickable(
                        By.xpath("//span[contains(text(), 'Join now')]")));
                    joinNowButton.click();
                    System.out.println("Bot clicked 'Join now'");
                } catch (Exception ex2) {
                    System.out.println("No join button found.");
                    ex2.printStackTrace();
                }
            }

            // 🧠 Loop for prompt input → AI response
            Scanner scanner = new Scanner(System.in);
            while (true) {
                System.out.print("You: ");
                String prompt = scanner.nextLine();

                if (prompt.equalsIgnoreCase("exit")) {
                    System.out.println("Exiting bot...");
                    break;
                }

                try {
                    ProcessBuilder pb = new ProcessBuilder("python", "speak.py", prompt);
                    pb.inheritIO();
                    pb.start();
                } catch (Exception e) {
                    System.out.println("Failed to speak:");
                    e.printStackTrace();
                }
            }

            scanner.close();

        } catch (Exception e) {
            System.out.println("ERROR: Could not complete join process.");
            e.printStackTrace();
        }
    }
}