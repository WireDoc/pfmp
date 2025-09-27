# Library Version Guidelines - Latest & Greatest

> **Note for AI/Development:** Always use the most current stable versions of libraries. This file documents the latest-and-greatest approaches as of September 2025.

## 🚀 Frontend Stack (React Ecosystem)

### Material-UI (MUI) - v6.0+
```typescript
// ✅ ALWAYS USE Grid v2 (MUI v6+)
import { Grid } from '@mui/material';

<Grid container spacing={2}>
  <Grid size={{ xs: 12, sm: 6, md: 4 }}>
    <Component />
  </Grid>
</Grid>

// ❌ NEVER USE (Deprecated Grid v1)
<Grid item xs={12} sm={6} md={4}>
  <Component />
</Grid>
```

### React - v19.x
```typescript
// Use latest React 19 features
import { useState, useEffect, type FC } from 'react';

// Prefer function components with hooks
const Component: FC<Props> = ({ prop }) => {
  return <div>{prop}</div>;
};
```

### TypeScript - v5.7+
```json
// tsconfig.json - Use strictest settings
{
  "compilerOptions": {
    "strict": true,
    "verbatimModuleSyntax": true,    // Requires type-only imports
    "isolatedModules": true,
    "noUncheckedIndexedAccess": true
  }
}
```

```typescript
// Use type-only imports for interfaces
import type { User, Account } from './types';
import { userService } from './services';

// Use const objects instead of enums (better for strict mode)
export const TaskStatus = {
  Pending: 'Pending',
  InProgress: 'InProgress',
  Completed: 'Completed'
} as const;

export type TaskStatus = typeof TaskStatus[keyof typeof TaskStatus];
```

### Vite - v7.x
```json
// vite.config.ts - Latest configuration
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    target: 'esnext'
  }
});
```

## 🛠️ Backend Stack (.NET)

### .NET - v9.0
```xml
<!-- Use latest LTS version -->
<TargetFramework>net9.0</TargetFramework>
```

### Entity Framework Core - v9.0
```xml
<PackageReference Include="Microsoft.EntityFrameworkCore" Version="9.0.0" />
<PackageReference Include="Microsoft.EntityFrameworkCore.Design" Version="9.0.0" />
<PackageReference Include="Npgsql.EntityFrameworkCore.PostgreSQL" Version="9.0.0" />
```

### ASP.NET Core - v9.0
```csharp
// Program.cs - Modern minimal API approach
var builder = WebApplication.CreateBuilder(args);

// Add CORS for modern frontend frameworks
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        policy.WithOrigins("http://localhost:3000", "http://localhost:3001", "http://localhost:5173")
              .AllowAnyHeader()
              .AllowAnyMethod();
    });
});

var app = builder.Build();
app.UseCors("AllowFrontend");
```

## 📦 Package Management

### Frontend (npm/yarn)
```json
// package.json - Always use latest stable
{
  "dependencies": {
    "react": "^19.1.1",
    "@mui/material": "^6.0.0",
    "@mui/icons-material": "^6.0.0",
    "axios": "^1.7.0",
    "typescript": "^5.7.2"
  },
  "devDependencies": {
    "vite": "^7.1.6",
    "@vitejs/plugin-react": "^4.3.0"
  }
}
```

### Backend (NuGet)
```xml
<!-- Always use latest stable versions -->
<PackageReference Include="Microsoft.AspNetCore.OpenApi" Version="9.0.0" />
<PackageReference Include="Azure.AI.OpenAI" Version="2.1.0" />
```

## 🏗️ Architecture Patterns

### React Components (2025 Best Practices)
```typescript
// ✅ Modern function component with TypeScript
interface Props {
  readonly user: User;
  readonly onUpdate?: () => void;
}

export const UserProfile: FC<Props> = ({ user, onUpdate }) => {
  const [loading, setLoading] = useState(false);
  
  // Use optional chaining for defensive programming
  const displayName = user?.firstName?.trim() || 'Unknown';
  
  return (
    <Grid container spacing={2}>
      <Grid size={{ xs: 12, sm: 6 }}>
        <Typography>{displayName}</Typography>
      </Grid>
    </Grid>
  );
};
```

### API Controllers (.NET 9)
```csharp
// ✅ Modern controller with proper async/await
[ApiController]
[Route("api/[controller]")]
public class TasksController : ControllerBase
{
    private readonly ApplicationDbContext _context;

    public TasksController(ApplicationDbContext context)
    {
        _context = context;
    }

    [HttpGet("user/{userId}")]
    public async Task<ActionResult<IEnumerable<UserTask>>> GetTasks(int userId)
    {
        return await _context.Tasks
            .Where(t => t.UserId == userId)
            .ToListAsync();
    }
}
```

## 🔄 Migration & Upgrade Guidelines

### When Upgrading Libraries:
1. **Check breaking changes** in release notes
2. **Update TypeScript** first (usually most compatible)
3. **Update React** second (check for deprecated patterns)
4. **Update MUI** last (often has breaking changes in major versions)
5. **Test thoroughly** - especially Grid components and TypeScript compilation

### Red Flags (Avoid These Patterns):
```typescript
// ❌ Old MUI Grid syntax
<Grid item xs={12}>

// ❌ Default imports for types
import { User } from './types';

// ❌ Enums in strict TypeScript
enum TaskStatus { Pending, InProgress }

// ❌ Non-defensive programming
user.profile.name.toUpperCase()
```

### Green Flags (Use These Patterns):
```typescript
// ✅ New MUI Grid syntax
<Grid size={{ xs: 12 }}>

// ✅ Type-only imports
import type { User } from './types';

// ✅ Const objects instead of enums
const TaskStatus = { Pending: 'Pending' } as const;

// ✅ Defensive programming
user?.profile?.name?.toUpperCase() || 'Default'
```

---

## 📚 Resources for Latest Versions

- **React:** https://react.dev/blog (official blog for latest updates)
- **MUI:** https://mui.com/material-ui/migration/ (migration guides)
- **TypeScript:** https://devblogs.microsoft.com/typescript/ (release announcements)
- **Vite:** https://github.com/vitejs/vite/blob/main/packages/vite/CHANGELOG.md
- **.NET:** https://dotnet.microsoft.com/en-us/download/releases

> **AI Note:** When generating code, always check if you're using the latest patterns. This document should be updated quarterly to reflect new releases.