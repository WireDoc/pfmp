
using Microsoft.EntityFrameworkCore;
using PFMP_API.Services;

namespace PFMP_API
{
    public class Program
    {
        public static async Task Main(string[] args)
        {
            var builder = WebApplication.CreateBuilder(args);

            // Add services to the container.
            
            // Add Entity Framework
            builder.Services.AddDbContext<ApplicationDbContext>(options =>
                options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));

            // Add AI Service
            builder.Services.AddScoped<IAIService, AIService>();

            // Add Market Data Service
            builder.Services.AddHttpClient<IMarketDataService, MarketDataService>();
            builder.Services.AddScoped<IMarketDataService, MarketDataService>();

            // Add Portfolio Valuation Service
            builder.Services.AddScoped<IPortfolioValuationService, PortfolioValuationService>();

            // Add CORS
            builder.Services.AddCors(options =>
            {
                options.AddPolicy("AllowFrontend", policy =>
                {
                    policy.WithOrigins("http://localhost:3000", "http://localhost:3001", "http://localhost:5173")
                          .AllowAnyHeader()
                          .AllowAnyMethod();
                });
            });

            builder.Services.AddControllers();
            // Learn more about configuring OpenAPI at https://aka.ms/aspnet/openapi
            builder.Services.AddOpenApi();

            var app = builder.Build();

            // Configure the HTTP request pipeline.
            if (app.Environment.IsDevelopment())
            {
                app.MapOpenApi();
                // Disable HTTPS redirection in development
                // app.UseHttpsRedirection();
            }
            else
            {
                app.UseHttpsRedirection();
            }

            // Use CORS
            app.UseCors("AllowFrontend");

            app.UseAuthorization();

            app.MapControllers();

            // Seed development data if enabled
            if (app.Environment.IsDevelopment())
            {
                using var scope = app.Services.CreateScope();
                var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
                var config = scope.ServiceProvider.GetRequiredService<IConfiguration>();
                
                if (config.GetValue<bool>("Development:SeedTestData", false))
                {
                    context.Database.EnsureCreated();
                    await DevelopmentDataSeeder.SeedDevelopmentData(context);
                }
            }

            app.Run();
        }
    }
}
