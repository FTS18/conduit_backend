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
      body: randLines({ length: 15 }).join('\n\n'),
      tagList: randWord({ length: 4 }),
    },
    id,
  );

export const generateComment = async (id: number, slug: string) =>
  addComment(randParagraph(), slug, id);

const dummyArticles = [
  { title: 'Getting Started with React Hooks', description: 'Learn how to use React Hooks to manage state and side effects in your functional components.', body: 'React Hooks have revolutionized the way we write React components in modern web development. They allow you to use state and other React features without writing a class component, making functional components more powerful and flexible.\n\nThe useState hook is the most fundamental hook that lets you add state to functional components. It returns an array with two elements: the current state value and a function to update it. This hook replaces the need for this.state and this.setState in class components.\n\nThe useEffect hook handles side effects like API calls, subscriptions, and DOM manipulations. It combines the functionality of componentDidMount, componentDidUpdate, and componentWillUnmount lifecycle methods. You can control when effects run by providing a dependency array as the second argument.\n\nCustom hooks enable you to extract component logic into reusable functions. They follow the same rules as built-in hooks and allow you to share stateful logic between components without changing their hierarchy. Custom hooks always start with "use" and can call other hooks.\n\nThe rules of hooks are essential for proper functionality. Hooks must be called at the top level of React functions, never inside loops, conditions, or nested functions. This ensures they are called in the same order every time a component renders, which is crucial for React to correctly preserve state between multiple useState and useEffect calls.\n\nOther important hooks include useContext for consuming React context, useReducer for complex state management, useMemo for expensive calculations, and useCallback for optimizing function references. Each hook serves a specific purpose in building efficient React applications.\n\nHooks have made React development more intuitive and have encouraged better patterns like composition over inheritance. They have also made it easier to test components and share logic across different parts of an application.\n\nWhen migrating from class components to hooks, it\'s important to understand the mental model shift. Instead of thinking in terms of lifecycle methods, you think in terms of synchronizing with external systems and managing state changes.\n\nPerformance optimization with hooks involves understanding when components re-render and how to prevent unnecessary renders using React.memo, useMemo, and useCallback appropriately.', tags: ['react', 'hooks', 'javascript'] },
  { title: 'Mastering CSS Grid Layout', description: 'A comprehensive guide to CSS Grid - the modern way to create complex layouts.', body: 'CSS Grid is a powerful two-dimensional layout system that has transformed how we approach web design and layout creation. Unlike previous layout methods, Grid allows you to work with both rows and columns simultaneously, providing unprecedented control over element positioning.\n\nGrid containers are created by setting display: grid on an element, which establishes a new grid formatting context. All direct children of a grid container automatically become grid items, which can be positioned anywhere within the grid using various properties.\n\nExplicit grids are defined using grid-template-rows and grid-template-columns properties. You can specify track sizes using various units like pixels, percentages, fr units (fractional units), and the minmax() function for responsive designs.\n\nImplicit grids are automatically created when you place items outside the explicit grid. The grid-auto-rows and grid-auto-columns properties control the size of these automatically generated tracks.\n\nGrid lines are the dividing lines that make up the structure of the grid. They can be numbered or named, and items can be positioned by referencing these lines using properties like grid-row-start, grid-row-end, grid-column-start, and grid-column-end.\n\nGrid areas provide a semantic way to name sections of your layout using the grid-template-areas property. This makes your CSS more readable and maintainable, especially for complex layouts. You can then place items using the grid-area property.\n\nThe gap property (formerly grid-gap) creates space between grid tracks, replacing the need for margins in many cases. You can set different values for row and column gaps using row-gap and column-gap properties.\n\nAlignment in CSS Grid is handled through several properties. justify-items and align-items control the alignment of items within their grid areas, while justify-content and align-content control the alignment of the entire grid within its container.\n\nResponsive design with CSS Grid is incredibly flexible. You can use media queries to completely restructure layouts, change grid-template-areas, or adjust track sizes. The repeat() function with auto-fit and auto-fill keywords creates responsive grids that adapt to available space.\n\nCSS Grid works excellently with Flexbox. Grid is ideal for two-dimensional layouts, while Flexbox excels at one-dimensional layouts. Using them together provides the most flexible and powerful layout system available in CSS.', tags: ['css', 'layout', 'web-design'] },
  { title: 'Node.js Best Practices for Production', description: 'Essential best practices for building scalable and secure Node.js applications.', body: 'Building production-ready Node.js applications requires following established best practices that ensure scalability, security, and maintainability. These practices have been developed through years of community experience and real-world deployments.\n\nError handling is the foundation of robust Node.js applications. Always use try-catch blocks for synchronous code and proper error handling for asynchronous operations. Implement centralized error handling middleware in Express applications to catch and process errors consistently.\n\nSecurity should be a primary concern from the beginning of development. Always validate and sanitize user input to prevent injection attacks. Use HTTPS in production, implement proper authentication and authorization, and keep all dependencies updated to patch security vulnerabilities.\n\nEnvironment configuration management is crucial for different deployment stages. Use environment variables for configuration settings and never hardcode sensitive information like API keys or database credentials in your source code. Tools like dotenv help manage environment-specific configurations.\n\nPerformance optimization involves multiple strategies. Implement clustering to take advantage of multi-core systems, use caching strategies with Redis or Memcached, and implement proper database indexing. Monitor application performance using tools like New Relic or DataDog.\n\nCode organization and structure significantly impact maintainability. Use modules to organize code logically, follow consistent naming conventions, and implement proper separation of concerns. Consider using architectural patterns like MVC or clean architecture for larger applications.\n\nLogging is essential for debugging and monitoring production applications. Implement structured logging with different log levels (error, warn, info, debug) and use centralized logging solutions like ELK stack or cloud-based services for log aggregation and analysis.\n\nTesting should be comprehensive and automated. Implement unit tests for individual functions, integration tests for API endpoints, and end-to-end tests for complete user workflows. Use tools like Jest, Mocha, or Supertest for different testing needs.\n\nDatabase best practices include using connection pooling, implementing proper indexing strategies, and using transactions for data consistency. Consider using ORMs like Sequelize or Prisma for better database management and query optimization.\n\nDeployment strategies should include containerization with Docker, implementing CI/CD pipelines, and using process managers like PM2 for production deployments. Consider using container orchestration platforms like Kubernetes for scalable deployments.', tags: ['nodejs', 'backend', 'javascript'] },
  { title: 'Understanding Async/Await in JavaScript', description: 'Master asynchronous programming with async/await syntax in modern JavaScript.', body: 'Async/await is syntactic sugar built on top of Promises that makes asynchronous code look and behave more like synchronous code. This feature, introduced in ES2017, has revolutionized how developers handle asynchronous operations in JavaScript.\n\nThe async keyword is used to declare an asynchronous function that always returns a Promise. Even if you return a regular value from an async function, JavaScript automatically wraps it in a resolved Promise. This makes async functions consistent in their return behavior.\n\nThe await keyword can only be used inside async functions and pauses the execution of the function until the Promise resolves or rejects. This creates a more linear flow of code that\'s easier to read and understand compared to traditional Promise chains or callback patterns.\n\nError handling with async/await uses traditional try-catch blocks instead of .catch() methods. This provides a more familiar error handling pattern for developers coming from synchronous programming backgrounds and makes error handling more consistent throughout the codebase.\n\nSequential vs parallel execution is an important concept when working with multiple asynchronous operations. Using await in sequence will wait for each operation to complete before starting the next, while Promise.all() allows for parallel execution of independent operations.\n\nCommon pitfalls include forgetting to use await when calling async functions, not handling errors properly, and accidentally creating sequential operations when parallel execution would be more efficient. Understanding these patterns helps write more efficient asynchronous code.\n\nAsync/await works seamlessly with existing Promise-based APIs and libraries. You can await any function that returns a Promise, making it easy to integrate with fetch(), database operations, file system operations, and third-party APIs.\n\nPerformance considerations include understanding when to use parallel vs sequential execution, avoiding unnecessary awaits, and being mindful of the event loop. Proper use of async/await can significantly improve both code readability and application performance.\n\nDebugging async/await code is generally easier than debugging Promise chains or callbacks because stack traces are more meaningful and the code flow is more linear. Modern debugging tools provide excellent support for stepping through async/await code.\n\nBest practices include always handling errors with try-catch blocks, using Promise.all() for independent parallel operations, avoiding mixing async/await with .then() chains, and being explicit about when functions are async by using the async keyword consistently.', tags: ['javascript', 'async', 'promises'] },
  { title: 'Docker Containerization Complete Guide', description: 'Comprehensive guide to Docker containerization, from basics to production deployment.', body: 'Docker has revolutionized software deployment by allowing developers to package applications and all their dependencies into lightweight, portable containers that can run consistently across different environments. This containerization technology has become essential for modern DevOps practices.\n\nContainers are fundamentally different from virtual machines. While VMs virtualize entire operating systems, containers share the host OS kernel and isolate applications at the process level. This makes containers much more lightweight, faster to start, and more resource-efficient than traditional VMs.\n\nDockerfiles are text files that contain instructions for building Docker images. They define the base image, copy application code, install dependencies, set environment variables, expose ports, and specify the command to run when the container starts. Writing efficient Dockerfiles is crucial for creating optimized images.\n\nDocker images are read-only templates used to create containers. They are built in layers, with each instruction in a Dockerfile creating a new layer. This layered architecture enables efficient storage and transfer of images, as common layers can be shared between different images.\n\nContainer lifecycle management involves creating, starting, stopping, and removing containers. Docker provides commands to manage these operations, and understanding container states (created, running, paused, stopped, deleted) is important for effective container management.\n\nDocker Compose is a tool for defining and running multi-container Docker applications. Using a YAML file, you can configure your application\'s services, networks, and volumes, then create and start all services with a single command. This is essential for complex applications with multiple components.\n\nNetworking in Docker allows containers to communicate with each other and the outside world. Docker provides several network drivers including bridge, host, overlay, and macvlan networks. Understanding these networking options is crucial for designing scalable containerized applications.\n\nVolumes and bind mounts provide persistent storage for containers. Volumes are managed by Docker and are the preferred way to persist data, while bind mounts directly map host directories to container paths. Proper data management is essential for stateful applications.\n\nSecurity best practices include running containers as non-root users, using official base images, regularly updating images, scanning for vulnerabilities, and implementing proper secrets management. Container security should be considered throughout the development and deployment pipeline.\n\nProduction deployment strategies involve using container registries like Docker Hub or AWS ECR, implementing health checks, setting resource limits, using multi-stage builds to reduce image size, and integrating with orchestration platforms like Kubernetes or Docker Swarm for scalable deployments.', tags: ['docker', 'devops', 'deployment'] }
];

const main = async () => {
  try {
    // Create 4 dummy authors with Indian names
    const authors = [
      { username: 'arjun_sharma', email: 'arjun@example.com', password: 'password123', image: 'https://api.realworld.io/images/demo-avatar.png', demo: true },
      { username: 'priya_patel', email: 'priya@example.com', password: 'password123', image: 'https://api.realworld.io/images/demo-avatar.png', demo: true },
      { username: 'rohit_kumar', email: 'rohit@example.com', password: 'password123', image: 'https://api.realworld.io/images/demo-avatar.png', demo: true },
      { username: 'ananya_singh', email: 'ananya@example.com', password: 'password123', image: 'https://api.realworld.io/images/demo-avatar.png', demo: true }
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
