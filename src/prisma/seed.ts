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
  { title: 'Getting Started with React Hooks', slug: 'getting-started-with-react-hooks', description: 'Learn how to use React Hooks to manage state and side effects in your functional components.', body: 'React Hooks have revolutionized the way we write React components. They allow you to use state and other React features without writing a class.', tags: ['react', 'hooks', 'javascript'] },
  { title: 'Mastering CSS Grid Layout', slug: 'mastering-css-grid-layout', description: 'A comprehensive guide to CSS Grid - the modern way to create complex layouts.', body: 'CSS Grid is a powerful layout system that allows you to create two-dimensional layouts with rows and columns.', tags: ['css', 'layout', 'web-design'] },
  { title: 'Node.js Best Practices', slug: 'nodejs-best-practices', description: 'Essential best practices for building scalable Node.js applications.', body: 'Building production-ready Node.js applications requires following certain best practices. From error handling to security.', tags: ['nodejs', 'backend', 'javascript'] },
  { title: 'Understanding Async/Await', slug: 'understanding-async-await', description: 'Master asynchronous programming with async/await in JavaScript.', body: 'Async/await is syntactic sugar built on top of Promises that makes asynchronous code look and behave more like synchronous code.', tags: ['javascript', 'async', 'promises'] },
  { title: 'Docker for Beginners', slug: 'docker-for-beginners', description: 'Get started with Docker containerization and deployment.', body: 'Docker allows you to package your application and all its dependencies into a container that can run anywhere.', tags: ['docker', 'devops', 'deployment'] },
  { title: 'Vue.js vs React: A Comparison', slug: 'vuejs-vs-react-comparison', description: 'Compare Vue.js and React to help you choose the right framework.', body: 'Both Vue.js and React are popular JavaScript frameworks for building user interfaces. Each has its own strengths and weaknesses.', tags: ['vue', 'react', 'javascript', 'frameworks'] },
  { title: 'RESTful API Design Principles', slug: 'restful-api-design-principles', description: 'Learn how to design clean and scalable REST APIs.', body: 'REST is an architectural style for designing networked applications. Following REST principles helps create APIs that are intuitive and scalable.', tags: ['api', 'rest', 'backend', 'design'] },
  { title: 'Web Performance Optimization', slug: 'web-performance-optimization', description: 'Techniques to improve your website\'s loading speed and performance.', body: 'Website performance is crucial for user experience and SEO. Learn about code splitting, lazy loading, and caching.', tags: ['performance', 'optimization', 'web'] },
  { title: 'Introduction to GraphQL', slug: 'introduction-to-graphql', description: 'Discover GraphQL as an alternative to REST APIs.', body: 'GraphQL is a query language and runtime for APIs that allows clients to request exactly the data they need.', tags: ['graphql', 'api', 'backend'] },
  { title: 'Testing JavaScript Applications', slug: 'testing-javascript-applications', description: 'A guide to testing strategies and tools for JavaScript projects.', body: 'Testing is essential for maintaining code quality and preventing bugs. Learn about unit testing and integration testing.', tags: ['testing', 'javascript', 'quality-assurance'] }
];

const main = async () => {
  try {
    const users = await Promise.all(Array.from({length: 12}, () => generateUser()));
    users?.map(user => user);

    // Create dummy articles
    for (const dummy of dummyArticles) {
      await createArticle({
        title: dummy.title,
        description: dummy.description,
        body: dummy.body,
        tagList: dummy.tags
      }, users[0].id);
    }

    // eslint-disable-next-line no-restricted-syntax
    for await (const user of users) {
      const articles = await Promise.all(Array.from({length: 12}, () => generateArticle(user.id)));

      // eslint-disable-next-line no-restricted-syntax
      for await (const article of articles) {
        await Promise.all(users.map(userItem => generateComment(userItem.id, article.slug)));
      }
    }
  } catch (e) {
    console.error(e);

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
