
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authentication.OpenIdConnect;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using PFMP_API.Services;
using System.Text;
using System.Text.Json.Serialization;
using Microsoft.OpenApi.Models;

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

            // Add Advice Service (Wave 1 scaffold)
            builder.Services.AddScoped<IAdviceService, AdviceService>();
            builder.Services.AddScoped<IAdviceValidator, AdviceValidator>();

            // Add Authentication Services
            builder.Services.AddScoped<IPasswordHashService, PasswordHashService>();
            builder.Services.AddHttpClient<IAuthenticationService, AuthenticationService>();
            builder.Services.AddScoped<IAuthenticationService, AuthenticationService>();

            // Add Authentication & Authorization
            var authBuilder = builder.Services.AddAuthentication(options =>
            {
                options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
                options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
            })
            .AddJwtBearer(JwtBearerDefaults.AuthenticationScheme, options =>
            {
                var jwtKey = builder.Configuration["JWT:SecretKey"] ?? "PFMP-Dev-Secret-Key-Change-In-Production-2025";
                var issuer = builder.Configuration["JWT:Issuer"] ?? "PFMP-API";
                var audience = builder.Configuration["JWT:Audience"] ?? "PFMP-Frontend";

                options.TokenValidationParameters = new TokenValidationParameters
                {
                    ValidateIssuer = true,
                    ValidIssuer = issuer,
                    ValidateAudience = true,
                    ValidAudience = audience,
                    ValidateLifetime = true,
                    ValidateIssuerSigningKey = true,
                    IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey)),
                    ClockSkew = TimeSpan.Zero
                };
            });

            // Only add Azure AD OIDC if configuration is provided
            var tenantId = builder.Configuration["AzureAD:TenantId"];
            var clientId = builder.Configuration["AzureAD:ClientId"];
            var clientSecret = builder.Configuration["AzureAD:ClientSecret"];

            if (!string.IsNullOrEmpty(tenantId) && !string.IsNullOrEmpty(clientId))
            {
                authBuilder.AddOpenIdConnect("AzureAD", options =>
                {
                    options.Authority = $"https://login.microsoftonline.com/{tenantId}/v2.0";
                    options.ClientId = clientId;
                    options.ClientSecret = clientSecret;
                    options.ResponseType = "code";
                    options.SaveTokens = true;
                    options.Scope.Add("openid");
                    options.Scope.Add("profile");
                    options.Scope.Add("email");
                });
            }

            builder.Services.AddAuthorization();

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

            builder.Services.AddControllers()
                .AddJsonOptions(options =>
                {
                    options.JsonSerializerOptions.ReferenceHandler = ReferenceHandler.IgnoreCycles;
                    options.JsonSerializerOptions.WriteIndented = true;
                });
            // Learn more about configuring OpenAPI at https://aka.ms/aspnet/openapi
            builder.Services.AddEndpointsApiExplorer();
            builder.Services.AddSwaggerGen(c =>
            {
                c.SwaggerDoc("v1", new OpenApiInfo
                {
                    Title = "PFMP API",
                    Version = "v1",
                    Description = "Personal Financial Management Platform API"
                });
            });

            var app = builder.Build();

            // Configure the HTTP request pipeline.
            bool enableSwaggerAlways = builder.Configuration.GetValue<bool>("Swagger:Always", false);
            if (app.Environment.IsDevelopment() || enableSwaggerAlways)
            {
                app.UseSwagger();
                app.UseSwaggerUI(c =>
                {
                    c.SwaggerEndpoint("/swagger/v1/swagger.json", "PFMP API v1");
                    c.DocumentTitle = "PFMP API Docs";
                });
            }

            if (!app.Environment.IsDevelopment())
            {
                app.UseHttpsRedirection();
            }

            // Use CORS
            app.UseCors("AllowFrontend");

            app.UseAuthentication();
            app.UseAuthorization();

            app.MapControllers();

            // Lightweight health endpoint (unauthenticated)
            app.MapGet("/health", () => Results.Json(new
            {
                status = "OK",
                service = "PFMP-API",
                utc = DateTime.UtcNow,
                env = app.Environment.EnvironmentName
            }));

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
