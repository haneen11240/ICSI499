import org.openqa.selenium.By;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.WebElement;
import org.openqa.selenium.chrome.ChromeDriver;
import org.openqa.selenium.chrome.ChromeOptions;
import org.openqa.selenium.support.ui.ExpectedConditions;
import org.openqa.selenium.support.ui.WebDriverWait;
import java.time.Duration;
import java.util.HashMap;
import java.util.Map;

public class GoogleMeetBotAI {
    public static void main(String[] args) throws InterruptedException {
        // No need for explicit ChromeDriver path if running in Docker with chrome pre-installed
        ChromeOptions options = new ChromeOptions();
        options.addArguments("--no-sandbox");
        options.addArguments("--disable-dev-shm-usage");
        options.addArguments("--disable-gpu");
        options.addArguments("--headless=new");
        options.addArguments("--user-data-dir=/tmp/chrome-profile");

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
            try {
                WebElement nameInput = new WebDriverWait(driver, Duration.ofSeconds(5))
                        .until(ExpectedConditions.visibilityOfElementLocated(By.xpath("//input[@aria-label='Your name']")));
                nameInput.clear();
                nameInput.sendKeys("Ora Bot");
            } catch (Exception e) {
                System.out.println("Name input not found.");
            }

            try {
                WebElement micButton = wait.until(ExpectedConditions.elementToBeClickable(
                        By.xpath("//div[@aria-label='Turn off microphone']")));
                micButton.click();
            } catch (Exception e) {
                System.out.println("Mic button not found or already off.");
            }

            try {
                WebElement cameraButton = wait.until(ExpectedConditions.elementToBeClickable(
                        By.xpath("//div[@aria-label='Turn off camera']")));
                cameraButton.click();
            } catch (Exception e) {
                System.out.println("Camera button not found or already off.");
            }

            try {
                WebElement askToJoin = wait.until(ExpectedConditions.elementToBeClickable(
                        By.xpath("//span[contains(text(), 'Ask to join')]")));
                askToJoin.click();
            } catch (Exception ex1) {
                try {
                    WebElement joinNow = wait.until(ExpectedConditions.elementToBeClickable(
                            By.xpath("//span[contains(text(), 'Join now')]")));
                    joinNow.click();
                } catch (Exception ex2) {
                    System.out.println("Join button not found.");
                }
            }

            System.out.println("Bot joined the call.");

            Thread.sleep(300000); // Stay in call for 5 mins then quit

        } catch (Exception e) {
            e.printStackTrace();
        } finally {
            driver.quit();
        }
    }
}