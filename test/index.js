'use strict';


const Code = require('code');
const GraphQL = require('graphql');
const Hapi = require('hapi');
const Lab = require('lab');
const Scalars = require('scalars');
const Graphi = require('../');


const { GraphQLObjectType, GraphQLSchema, GraphQLString } = GraphQL;
const lab = exports.lab = Lab.script();
const describe = lab.describe;
const it = lab.it;
const expect = Code.expect;


describe('graphi', () => {
  it('can be registered with hapi', async () => {
    const server = Hapi.server();
    await server.register(Graphi);
  });

  it('will handle graphql GET requests with promise resolver', async () => {
    const schema = `
      type Person {
        firstname: String!
        lastname: String!
      }

      type Query {
        person(firstname: String!): Person!
      }
    `;

    const getPerson = function (args, request) {
      expect(args.firstname).to.equal('tom');
      expect(request.path).to.equal('/graphql');
      return { firstname: 'tom', lastname: 'arnold' };
    };

    const resolvers = {
      person: getPerson
    };

    const server = Hapi.server();
    await server.register({ plugin: Graphi, options: { schema, resolvers } });
    const url = '/graphql?query=%7B%0A%20%20person(firstname%3A%22tom%22)%20%7B%0A%20%20%20%20lastname%0A%20%20%7D%0A%7D&variables=%7B%22hi%22%3A%20true%7D';

    const res = await server.inject({ method: 'GET', url });
    expect(res.statusCode).to.equal(200);
    expect(res.result.data.person.lastname).to.equal('arnold');
  });

  it('will handle graphql GET requests GraphQL instance schema', async () => {
    const schema = new GraphQLSchema({
      query: new GraphQLObjectType({
        name: 'RootQueryType',
        fields: {
          person: {
            type: GraphQLString,
            args: {
              firstname: { type: new Scalars.JoiString({ min: [2, 'utf8'], max: 10 }) }
            },
            resolve: (root, { firstname }, request) => {
              return firstname;
            }
          }
        }
      })
    });

    const server = Hapi.server();
    await server.register({ plugin: Graphi, options: { schema } });
    const url = '/graphql?query=' + encodeURIComponent('{ person(firstname: "tom")}');

    const res = await server.inject({ method: 'GET', url });
    expect(res.statusCode).to.equal(200);
    expect(res.result.data.person).to.equal('tom');
  });

  it('will handle graphql POST requests with query', async () => {
    const schema = `
      type Person {
        firstname: String!
        lastname: String!
        email: String!
      }

      type Query {
        person(firstname: String!): Person!
      }
    `;

    const getPerson = function (args, request) {
      expect(args.firstname).to.equal('billy');
      expect(request.path).to.equal('/graphql');
      return { firstname: '', lastname: 'jean', email: 'what' };
    };

    const resolvers = {
      person: getPerson
    };

    const server = Hapi.server();
    await server.register({ plugin: Graphi, options: { schema, resolvers } });
    const payload = { query: 'query { person(firstname: "billy") { lastname, email } }' };

    const res = await server.inject({ method: 'POST', url: '/graphql', payload });
    expect(res.statusCode).to.equal(200);
    expect(res.result.data.person.lastname).to.equal('jean');
  });

  it('will handle graphql POST requests with query using GraphQL schema objects', async () => {
    const schema = new GraphQL.GraphQLSchema({
      query: new GraphQL.GraphQLObjectType({
        name: 'RootQueryType',
        fields: {
          person: {
            type: GraphQL.GraphQLString,
            args: { firstname: { type: GraphQL.GraphQLString } },
            resolve: (root, args) => {
              expect(args.firstname).to.equal('billy');
              return 'jean';
            }
          }
        }
      })
    });

    const server = Hapi.server();
    await server.register({ plugin: Graphi, options: { schema } });
    const payload = { query: 'query { person(firstname: "billy") }' };

    const res = await server.inject({ method: 'POST', url: '/graphql', payload });
    expect(res.statusCode).to.equal(200);
    expect(res.result.data.person).to.equal('jean');
  });

  it('will handle graphql POST requests with mutations', async () => {
    const schema = `
      type Person {
        id: ID!
        firstname: String!
        lastname: String!
      }

      type Mutation {
        createPerson(firstname: String!, lastname: String!): Person!
      }

      type Query {
        person(firstname: String!): Person!
      }
    `;

    const getPerson = function (args, request) {
      expect(args.firstname).to.equal('billy');
      expect(request.path).to.equal('/graphql');
      return { firstname: 'billy', lastname: 'jean' };
    };

    const createPerson = function (args, request) {
      expect(args.firstname).to.equal('billy');
      expect(args.lastname).to.equal('jean');
      expect(request.path).to.equal('/graphql');
      return { firstname: 'billy', lastname: 'jean' };
    };

    const resolvers = {
      createPerson,
      person: getPerson
    };

    const server = Hapi.server();
    await server.register({ plugin: Graphi, options: { schema, resolvers } });
    const payload = { query: 'mutation { createPerson(firstname: "billy", lastname: "jean") { lastname } }' };

    const res = await server.inject({ method: 'POST', url: '/graphql', payload });
    expect(res.statusCode).to.equal(200);
    expect(res.result.data.createPerson.lastname).to.equal('jean');
  });

  it('will error with requests that include unknown directives', async () => {
    const schema = `
      type Person {
        firstname: String! @limit(min: 1)
        lastname: String!
      }

      type Query {
        person(firstname: String!): Person!
      }
    `;

    const getPerson = function (args, request) {
      expect(args.firstname).to.equal('billy');
      expect(request.path).to.equal('/graphql');
      return { firstname: '', lastname: 'jean' };
    };

    const resolvers = {
      person: getPerson
    };

    const server = Hapi.server();
    await server.register({ plugin: Graphi, options: { schema, resolvers } });
    const payload = { query: 'query { person(firstname: "billy") { lastname @foo(min: 2) } }' };

    const res = await server.inject({ method: 'POST', url: '/graphql', payload });
    expect(res.statusCode).to.equal(400);
    expect(res.result.message).to.contain('Unknown directive');
  });

  it('will handle graphql GET requests with invalid variables', async () => {
    const schema = `
      type Person {
        firstname: String!
        lastname: String!
      }

      type Query {
        person(firstname: String!): Person!
      }
    `;

    const getPerson = function (args, request) {
      expect(args.firstname).to.equal('tom');
      expect(request.path).to.equal('/graphql');
      return Promise.resolve({ firstname: 'tom', lastname: 'arnold' });
    };

    const resolvers = {
      person: getPerson
    };

    const server = Hapi.server();
    await server.register({ plugin: Graphi, options: { schema, resolvers } });
    const url = '/graphql?query=%7B%0A%20%20person(firstname%3A%22tom%22)%20%7B%0A%20%20%20%20lastname%0A%20%20%7D%0A%7D&variables=invalid';

    const res = await server.inject({ method: 'GET', url });
    expect(res.statusCode).to.equal(400);
  });

  it('will wrap 400 errors', async () => {
    const schema = `
      type Person {
        firstname: String!
        lastname: String!
      }

      type Query {
        person(firstname: String!): Person!
      }
    `;

    const getPerson = function (args, request) {
      expect(args.firstname).to.equal('tom');
      expect(request.path).to.equal('/graphql');
      return Promise.resolve({ firstname: 'tom', lastname: 'arnold' });
    };

    const resolvers = {
      person: getPerson
    };

    const server = Hapi.server();
    server.register({ plugin: Graphi, options: { schema, resolvers } });
    const url = '/graphql?query={}';

    const res = await server.inject({ method: 'GET', url });
    expect(res.statusCode).to.equal(400);
  });

  it('will log result with errors property', async () => {
    const schema = `
      type Person {
        firstname: String!
        lastname: String!
      }

      type Query {
        person(firstname: String!): Person!
      }
    `;

    const getPerson = function (args, request) {
      expect(args.firstname).to.equal('tom');
      expect(request.path).to.equal('/graphql');
      return { errors: [new Error()] };
    };

    const resolvers = {
      person: getPerson
    };

    const server = Hapi.server();
    server.register({ plugin: Graphi, options: { schema, resolvers } });
    const url = '/graphql?query=%7B%0A%20%20person(firstname%3A%22tom%22)%20%7B%0A%20%20%20%20lastname%0A%20%20%7D%0A%7D&variables=%7B%22hi%22%3A%20true%7D';

    await server.inject({ method: 'GET', url });
  });

  it('will wrap errors with a promise resolver', async () => {
    const schema = `
      type Person {
        firstname: String!
        lastname: String!
      }

      type Query {
        person(firstname: String!): Person!
      }
    `;

    const getPerson = function (args, request) {
      expect(args.firstname).to.equal('tom');
      expect(request.path).to.equal('/graphql');
      return Promise.reject(new Error('my custom error'));
    };

    const resolvers = {
      person: getPerson
    };

    const server = Hapi.server();
    await server.register({ plugin: Graphi, options: { schema, resolvers } });
    const url = '/graphql?query=%7B%0A%20%20person(firstname%3A%22tom%22)%20%7B%0A%20%20%20%20lastname%0A%20%20%7D%0A%7D';

    const res = await server.inject({ method: 'GET', url });
    expect(res.statusCode).to.equal(200);
    expect(res.result.errors).to.exist();
  });

  it('will wrap errors thrown in resolver', async () => {
    const schema = `
      type Person {
        firstname: String!
        lastname: String!
      }

      type Query {
        person(firstname: String!): Person!
      }
    `;

    const getPerson = function (args, request) {
      expect(args.firstname).to.equal('tom');
      expect(request.path).to.equal('/graphql');
      throw new Error('my custom error');
    };

    const resolvers = {
      person: getPerson
    };

    const server = Hapi.server();
    await server.register({ plugin: Graphi, options: { schema, resolvers } });
    const url = '/graphql?query=%7B%0A%20%20person(firstname%3A%22tom%22)%20%7B%0A%20%20%20%20lastname%0A%20%20%7D%0A%7D';

    const res = await server.inject({ method: 'GET', url });
    expect(res.statusCode).to.equal(200);
    expect(res.result.errors).to.exist();
  });

  it('will serve the GraphiQL UI', async () => {
    const schema = `
      type Person {
        firstname: String!
        lastname: String!
      }

      type Query {
        person(firstname: String!): Person!
      }
    `;

    const getPerson = function (args, request) {
      return Promise.resolve({ firstname: 'billy', lastname: 'jean' });
    };

    const resolvers = {
      person: getPerson
    };

    const server = Hapi.server();
    await server.register({ plugin: Graphi, options: { schema, resolvers } }, { routes: { prefix: '/test' } });

    const res = await server.inject({ method: 'GET', url: '/test/graphiql' });
    expect(res.statusCode).to.equal(200);
    expect(res.result).to.contain('<html>');
  });

  it('will serve the GraphiQL UI prepopulated with the query', async () => {
    const schema = `
      type Person {
        firstname: String!
        lastname: String!
      }

      type Query {
        person(firstname: String!): Person!
      }
    `;

    const getPerson = function (args, request) {
      return Promise.resolve({ firstname: 'billy', lastname: 'jean' });
    };

    const resolvers = {
      person: getPerson
    };

    const server = Hapi.server();
    await server.register({ plugin: Graphi, options: { schema, resolvers } });

    const res = await server.inject({ method: 'GET', url: '/graphiql?query=%7B%0A%20%20person(firstname%3A%22tom%22)%20%7B%0A%20%20%20%20lastname%0A%20%20%7D%0A%7D&variables=%7B%22hi%22%3A%20true%7D' });
    expect(res.statusCode).to.equal(200);
    expect(res.result).to.contain('person');
  });

  it('can disable GraphiQL UI', async () => {
    const schema = `
      type Person {
        firstname: String!
        lastname: String!
      }

      type Query {
        person(firstname: String!): Person!
      }
    `;

    const getPerson = function (args, request) {
      return Promise.resolve({ firstname: 'billy', lastname: 'jean' });
    };

    const resolvers = {
      person: getPerson
    };

    const server = Hapi.server();
    await server.register({ plugin: Graphi, options: { schema, resolvers, graphiqlPath: false } });

    const res = await server.inject({ method: 'GET', url: '/graphiql' });
    expect(res.statusCode).to.equal(404);
  });

  it('will handle nested queries', async () => {
    const schema = `
      type Person {
        firstname: String!
        lastname: String!
        friends(firstname: String!): [Person]
      }

      type Query {
        person(firstname: String!): Person!
      }
    `;

    const getFriends = function (args, request) {
      expect(args.firstname).to.equal('michael');

      return Promise.resolve([{ firstname: 'michael', lastname: 'jackson' }]);
    };

    const getPerson = function (args, request) {
      expect(args.firstname).to.equal('billy');
      expect(request.path).to.equal('/graphql');

      return Promise.resolve({ firstname: 'billy', lastname: 'jean', friends: getFriends });
    };

    const resolvers = {
      person: getPerson,
      friends: getFriends
    };

    const server = Hapi.server();
    await server.register({ plugin: Graphi, options: { schema, resolvers } });
    const payload = {
      query: 'query GetPersonsFriend($firstname: String!, $friendsFirstname: String!) { person(firstname: $firstname) { friends(firstname: $friendsFirstname) { lastname } } }',
      variables: { firstname: 'billy', friendsFirstname: 'michael' }
    };

    const res = await server.inject({ method: 'POST', url: '/graphql', payload });
    expect(res.statusCode).to.equal(200);
    expect(res.result.data.person.friends[0].lastname).to.equal('jackson');
  });

  it('will handle invalid queries in POST request', async () => {
    const schema = `
      type Person {
        firstname: String!
        lastname: String!
        friends(firstname: String!): [Person]
      }

      type Query {
        person(firstname: String!): Person!
      }
    `;

    const getFriends = function (args, request) {
      expect(args.firstname).to.equal('michael');

      return Promise.resolve([{ firstname: 'michael', lastname: 'jackson' }]);
    };

    const getPerson = function (args, request) {
      expect(args.firstname).to.equal('billy');
      expect(request.path).to.equal('/graphql');

      return Promise.resolve({ firstname: 'billy', lastname: 'jean', friends: getFriends });
    };

    const resolvers = {
      person: getPerson,
      friends: getFriends
    };

    const server = Hapi.server();
    await server.register({ plugin: Graphi, options: { schema, resolvers } });

    const payload = {
      query: 'query GetPersonsF} }',
      variables: { firstname: 'billy', friendsFirstname: 'michael' }
    };

    const res = await server.inject({ method: 'POST', url: '/graphql', payload });
    expect(res.statusCode).to.equal(400);
  });

  it('will handle graphql POST request without a payload', async () => {
    const schema = `
      type Person {
        firstname: String!
        lastname: String!
        email: String!
      }

      type Query {
        person(firstname: String!): Person!
      }
    `;

    const getPerson = function (args, request) {
      expect(args.firstname).to.equal('billy');
      expect(request.path).to.equal('/graphql');
      return { firstname: '', lastname: 'jean', email: 'what' };
    };

    const resolvers = {
      person: getPerson
    };

    const server = Hapi.server();
    await server.register({ plugin: Graphi, options: { schema, resolvers } });

    const res = await server.inject({ method: 'POST', url: '/graphql' });
    expect(res.statusCode).to.equal(400);
  });

  it('will handle graphql OPTIONS request when cors is disabled', async () => {
    const schema = `
      type Person {
        firstname: String!
        lastname: String!
        email: String!
      }

      type Query {
        person(firstname: String!): Person!
      }
    `;

    const getPerson = function (args, request) {
      expect(args.firstname).to.equal('billy');
      expect(request.path).to.equal('/graphql');
      return { firstname: '', lastname: 'jean', email: 'what' };
    };

    const resolvers = {
      person: getPerson
    };

    const server = Hapi.server();
    await server.register({ plugin: Graphi, options: { schema, resolvers } });

    const res = await server.inject({ method: 'OPTIONS', url: '/graphql' });
    expect(res.statusCode).to.equal(200);
  });
});
