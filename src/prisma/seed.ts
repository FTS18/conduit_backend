import {
  randEmail,
  randFullName,
  randLines,
  randParagraph,
  randPassword, randPhrase,
  randWord
} from '@ngneat/falso';
import { PrismaClient } from '@prisma/client';
import { RegisteredUser } from '../app/routes/auth/registered-user.model';
import { createUser } from '../app/routes/auth/auth.service';
import { addComment, createArticle } from '../app/routes/article/article.service';

const prisma = new PrismaClient();

export const generateUser = async (): Promise<RegisteredUser> =>
  createUser({
    username: randFullName(),
    email: randEmail(),
    password: randPassword(),
    image: 'https://api.realworld.io/images/demo-avatar.png',
    demo: true,
  });

export const generateArticle = async (id: number) =>
  createArticle(
    {
      title: randPhrase(),
      description: randParagraph(),
      body: randLines({ length: 10 }).join(' '),
      tagList: randWord({ length: 4 }),
    },
    id,
  );

export const generateComment = async (id: number, slug: string) =>
  addComment(randParagraph(), slug, id);

const dummyArticles = [
  { title: 'Getting Started with React Hooks', description: 'Learn how to use React Hooks to manage state and side effects in your functional components.', body: 'React Hooks have revolutionized the way we write React components. They allow you to use state and other React features without writing a class. useState lets you add state to functional components, while useEffect handles side effects like API calls and subscriptions. Custom hooks enable you to extract component logic into reusable functions. The rules of hooks ensure that they are called in the same order every time a component renders. This consistency is crucial for React to correctly preserve state between multiple useState and useEffect calls.', tags: ['react', 'hooks', 'javascript'] },
  { title: 'Mastering CSS Grid Layout', description: 'A comprehensive guide to CSS Grid - the modern way to create complex layouts.', body: 'CSS Grid is a powerful layout system that allows you to create two-dimensional layouts with rows and columns. Unlike Flexbox which is one-dimensional, Grid can handle both rows and columns simultaneously. Grid containers define the grid context, while grid items are positioned within the grid. You can create explicit grids with grid-template-rows and grid-template-columns, or let the browser create implicit grids automatically. Grid areas provide a semantic way to name sections of your layout, making your CSS more readable and maintainable.', tags: ['css', 'layout', 'web-design'] },
  { title: 'Node.js Best Practices', description: 'Essential best practices for building scalable Node.js applications.', body: 'Building production-ready Node.js applications requires following certain best practices. Error handling should be comprehensive, using try-catch blocks and proper error middleware. Security is paramount - always validate input, use HTTPS, and keep dependencies updated. Performance optimization includes using clustering, caching strategies, and monitoring tools. Code organization matters - use modules, follow consistent naming conventions, and implement proper logging. Testing should cover unit tests, integration tests, and end-to-end scenarios to ensure reliability.', tags: ['nodejs', 'backend', 'javascript'] },
  { title: 'Understanding Async/Await', description: 'Master asynchronous programming with async/await in JavaScript.', body: 'Async/await is syntactic sugar built on top of Promises that makes asynchronous code look and behave more like synchronous code. The async keyword declares an asynchronous function that returns a Promise. The await keyword pauses execution until the Promise resolves or rejects. Error handling with async/await uses traditional try-catch blocks instead of .catch() methods. This approach makes code more readable and easier to debug. Remember that await can only be used inside async functions, and always handle potential errors appropriately.', tags: ['javascript', 'async', 'promises'] },
  { title: 'Docker for Beginners', description: 'Get started with Docker containerization and deployment.', body: 'Docker allows you to package your application and all its dependencies into a container that can run anywhere. Containers are lightweight, portable, and consistent across different environments. Dockerfiles define how to build container images, specifying the base image, dependencies, and configuration. Docker Compose orchestrates multi-container applications, defining services, networks, and volumes. Best practices include using multi-stage builds, minimizing layer count, and following security guidelines. Container registries like Docker Hub store and distribute images for easy deployment.', tags: ['docker', 'devops', 'deployment'] }
];

const main = async () => {
  try {
    // Create 4 dummy authors
    const authors = [
      { username: 'john_doe', email: 'john@example.com', password: 'password123', image: 'https://api.realworld.io/images/demo-avatar.png', demo: true },
      { username: 'jane_smith', email: 'jane@example.com', password: 'password123', image: 'https://api.realworld.io/images/demo-avatar.png', demo: true },
      { username: 'mike_wilson', email: 'mike@example.com', password: 'password123', image: 'https://api.realworld.io/images/demo-avatar.png', demo: true },
      { username: 'sarah_jones', email: 'sarah@example.com', password: 'password123', image: 'https://api.realworld.io/images/demo-avatar.png', demo: true }
    ];
    
    const users = await Promise.all(authors.map(author => createUser(author)));
    console.log(`Created ${users.length} authors`);

    // Create 20 articles (5 by each author)
    const articlePromises = [];
    for (let i = 0; i < 20; i++) {
      const authorIndex = i % 4; // Distribute articles among 4 authors
      const articleIndex = Math.floor(i / 4);
      
      if (articleIndex < dummyArticles.length) {
        // Use predefined articles
        articlePromises.push(createArticle({
          title: dummyArticles[articleIndex].title,
          description: dummyArticles[articleIndex].description,
          body: dummyArticles[articleIndex].body,
          tagList: dummyArticles[articleIndex].tags
        }, users[authorIndex].id));
      } else {
        // Generate random articles for remaining slots
        articlePromises.push(generateArticle(users[authorIndex].id));
      }
    }
    
    const articles = await Promise.all(articlePromises);
    console.log(`Created ${articles.length} articles`);

    // Add comments to articles
    for (const article of articles) {
      await Promise.all(users.map(user => generateComment(user.id, article.slug)));
    }
    
    console.log('Seeding completed successfully!');
  } catch (e) {
    console.error('Seeding failed:', e);
  }
};

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async () => {
    await prisma.$disconnect();
    process.exit(1);
  });
