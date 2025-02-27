import org.openqa.selenium.By;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.WebElement;
import org.openqa.selenium.chrome.ChromeDriver;
import org.openqa.selenium.chrome.ChromeOptions;
import org.openqa.selenium.support.ui.ExpectedConditions;
import org.openqa.selenium.support.ui.WebDriverWait;
import java.time.Duration;

public class GoogleMeetBot {
    public static void main(String[] args) throws InterruptedException {
        System.setProperty("webdriver.chrome.driver", "C:\\Users\\Enea\\Documents\\TestFor499\\chromedriver\\chromedriver.exe");

        ChromeOptions options = new ChromeOptions();
        options.addArguments("user-data-dir=C:\\Users\\Enea\\AppData\\Local\\Google\\Chrome\\User Data");
        options.addArguments("--profile-directory=Default"); // enea def chrome

        // chrome backups
        options.addArguments("--remote-debugging-port=9222");
        options.addArguments("--disable-extensions");
        options.addArguments("--no-sandbox");
        options.addArguments("--disable-gpu");
        options.addArguments("--disable-dev-shm-usage");

        WebDriver driver = new ChromeDriver(options);
        driver.get("https://meet.google.com/dtk-uude-myh");

        // delay for page to load
        WebDriverWait wait = new WebDriverWait(driver, Duration.ofSeconds(10));

        try {
            // mic settings
            WebElement micButton = wait.until(ExpectedConditions.elementToBeClickable(By.xpath("//div[@aria-label='Turn off microphone']")));
            micButton.click();

            // cam settings
            WebElement cameraButton = wait.until(ExpectedConditions.elementToBeClickable(By.xpath("//div[@aria-label='Turn off camera']")));
            cameraButton.click();

            // join or ask
            WebElement joinButton = wait.until(ExpectedConditions.elementToBeClickable(By.xpath("//span[contains(text(), 'Ask to join?')]")));
            joinButton.click();

            System.out.println("Bot has joined the meeting!");
        } catch (Exception e) {
            System.out.println("ERROR: Could not find Google Meet elements.");
            e.printStackTrace();
        }
    }
}