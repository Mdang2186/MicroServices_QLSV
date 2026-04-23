import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { DashboardService } from "./dashboard/dashboard.service";

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const dashboardService = app.get(DashboardService);
  
  try {
    console.log("Calling getStats...");
    const stats = await dashboardService.getStats();
    console.log("Success");
  } catch (err) {
    console.error("ERROR CAUGHT IN GETSTATS:");
    console.error(err);
  } finally {
    await app.close();
  }
}
main();
