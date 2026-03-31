export type BlogPostBlock =
  | { type: 'h1'; text: string }
  | { type: 'h2'; text: string }
  | { type: 'h3'; text: string }
  | { type: 'p'; text: string }
  | { type: 'ul'; items: string[] }
  | { type: 'code'; language?: string; code: string };

export type BlogPost = {
  slug: string;
  title: string;
  author: string;
  dateISO: string;
  readTime: string;
  tags: string[];
  blocks: BlogPostBlock[];
};

export const BLOG_POSTS: BlogPost[] = [
  {
    slug: 'how-to-deploy-a-container-for-free-step-by-step-technical-guide',
    title: 'How to Deploy a Container for Free: Step-by-Step Technical Guide',
    author: 'SnapDeploy Team',
    dateISO: '2026-01-06',
    readTime: '8 min read',
    tags: ['tutorial', 'docker', 'deployment', 'step-by-step', 'beginners', 'free container hosting'],
    blocks: [
      { type: 'h1', text: 'How to Deploy a Container for Free: Step-by-Step Technical Guide' },
      {
        type: 'p',
        text:
          "This hands-on guide walks you through deploying your first Docker container for free. We'll cover project setup, Dockerfile creation, environment configuration, and the actual deployment process with real code examples.",
      },
      { type: 'h2', text: 'Prerequisites' },
      { type: 'ul', items: ['A GitHub account', 'Basic familiarity with the command line', "A simple application (we'll use a Node.js example)"] },
      { type: 'h2', text: 'Step 1: Prepare Your Application' },
      { type: 'p', text: "Let's create a simple Express.js application. Create these files in your project:" },
      { type: 'h3', text: 'package.json' },
      {
        type: 'code',
        language: 'json',
        code: `{
  "name": "my-free-container",
  "version": "1.0.0",
  "main": "index.js",
  "scripts": {
    "start": "node index.js"
  },
  "dependencies": {
    "express": "^4.18.2"
  }
}`,
      },
      { type: 'h3', text: 'index.js' },
      {
        type: 'code',
        language: 'js',
        code: `const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.json({
    status: 'running',
    message: 'Hello from my free container!',
    timestamp: new Date().toISOString()
  });
});

app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

app.listen(PORT, () => {
  console.log(\`Server running on port \${PORT}\`);
});`,
      },
      { type: 'h2', text: 'Step 2: Create a Dockerfile' },
      { type: 'p', text: 'Add a Dockerfile to your project root:' },
      { type: 'h3', text: 'Dockerfile' },
      {
        type: 'code',
        language: 'dockerfile',
        code: `# Use official Node.js LTS image
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package files first (for better caching)
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy application code
COPY . .

# Expose the port your app runs on
EXPOSE 3000

# Start the application
CMD ["npm", "start"]`,
      },
      { type: 'h3', text: 'Dockerfile Best Practices' },
      {
        type: 'ul',
        items: [
          'Use Alpine images — Smaller size means faster builds',
          'Copy package.json first — Enables Docker layer caching',
          'Use npm ci — Faster and more reliable than npm install',
          "Don't run as root — Add a non-root user for production",
        ],
      },
      { type: 'h2', text: 'Step 3: Add a .dockerignore File' },
      { type: 'p', text: 'Create .dockerignore to exclude unnecessary files:' },
      {
        type: 'code',
        language: 'text',
        code: `node_modules
npm-debug.log
.git
.gitignore
.env
*.md
.DS_Store`,
      },
      { type: 'h2', text: 'Step 4: Test Locally (Optional)' },
      { type: 'p', text: 'Before deploying, verify your container works locally:' },
      {
        type: 'code',
        language: 'bash',
        code: `# Build the image
docker build -t my-app .

# Run the container
docker run -p 3000:3000 my-app

# Test it
curl http://localhost:3000`,
      },
      { type: 'h2', text: 'Step 5: Push to GitHub' },
      { type: 'p', text: 'Initialize a git repository and push your code:' },
      {
        type: 'code',
        language: 'bash',
        code: `git init
git add .
git commit -m "Initial commit with Dockerfile"
git remote add origin https://github.com/yourusername/my-app.git
git push -u origin main`,
      },
      { type: 'h2', text: 'Step 6: Deploy to SnapDeploy' },
      { type: 'p', text: 'Now deploy your containerized application:' },
      {
        type: 'ul',
        items: [
          'Create account — Go to snapdeploy.dev and sign up (no credit card)',
          'New Container — Click "New Container" in the dashboard',
          'Connect GitHub — Authorize access and select your repository',
          'Configure — Set container name (becomes your-app.containers.snapdeploy.dev)',
          'Deploy — Click Deploy and watch the build logs',
        ],
      },
      { type: 'h2', text: 'Step 7: Configure Environment Variables' },
      { type: 'p', text: 'If your app needs environment variables, add them in the dashboard:' },
      {
        type: 'code',
        language: 'bash',
        code: `# Example environment variables
NODE_ENV=production
DATABASE_URL=postgresql://user:pass@host:5432/db
API_KEY=your-secret-key`,
      },
      { type: 'p', text: 'Access them in your code with process.env.VARIABLE_NAME.' },
      { type: 'h2', text: 'Step 8: Verify Deployment' },
      { type: 'p', text: 'Once deployed, test your live container:' },
      {
        type: 'code',
        language: 'bash',
        code: `# Test the root endpoint
curl https://your-app.containers.snapdeploy.dev`,
      },
      {
        type: 'code',
        language: 'json',
        code: `{
  "status": "running",
  "message": "Hello from my free container!",
  "timestamp": "2026-01-06T10:30:00.000Z"
}`,
      },
      { type: 'h2', text: 'Troubleshooting Common Issues' },
      { type: 'h3', text: 'Build fails with "npm ERR!"' },
      { type: 'p', text: 'Ensure package-lock.json is committed. Run npm install locally first.' },
      { type: 'h3', text: 'Container starts but returns 502' },
      { type: 'p', text: 'Check that your app listens on the PORT environment variable, not a hardcoded port.' },
      { type: 'h3', text: 'Container keeps restarting' },
      { type: 'p', text: 'Check the logs in the dashboard. Common cause: missing environment variables or database connection failures.' },
      { type: 'h2', text: 'Next Steps' },
      {
        type: 'ul',
        items: [
          'Configure environment variables for secrets and config',
          'Add a custom domain to your container',
          'Set up monitoring to track container health',
        ],
      },
      {
        type: 'p',
        text:
          "You now have a containerized application running for free. The free tier includes 100 hours of runtime—use the pause feature when not actively using your container to extend this further.",
      },
    ],
  },
];

export function getBlogPost(slug: string): BlogPost | undefined {
  return BLOG_POSTS.find((p) => p.slug === slug);
}

