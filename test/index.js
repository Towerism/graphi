'use strict';


const Hapi = require('hapi');
const Lab = require('lab');
const Graphi = require('../');


const lab = exports.lab = Lab.script();
const describe = lab.describe;
const it = lab.it;
const expect = Lab.expect;


describe('graphi', () => {
  it('can be registered with hapi', (done) => {
    const server = new Hapi.Server();
    server.connection();
    server.register(Graphi, (err) => {
      expect(err).to.not.exist();
      done();
    });
  });

  it('will handle graphql GET requests with promise resolver', (done) => {
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
      return new Promise((resolve) => {
        resolve({ firstname: 'tom', lastname: 'arnold' });
      });
    };

    const resolvers = {
      person: getPerson
    };

    const server = new Hapi.Server();
    server.connection();
    server.register({ register: Graphi, options: { schema, resolvers } }, (err) => {
      expect(err).to.not.exist();
      const url = '/graphql?query=%7B%0A%20%20person(firstname%3A%22tom%22)%20%7B%0A%20%20%20%20lastname%0A%20%20%7D%0A%7D&variables=%7B%22hi%22%3A%20true%7D';

      server.inject({ method: 'GET', url }, (res) => {
        expect(res.statusCode).to.equal(200);
        expect(res.result.data.person.lastname).to.equal('arnold');
        done();
      });
    });
  });

  it('will handle graphql GET requests with callback resolver', (done) => {
    const schema = `
      type Person {
        firstname: String!
        lastname: String!
      }

      type Query {
        person(firstname: String!): Person!
      }
    `;

    const getPerson = function (args, request, cb) {
      expect(args.firstname).to.equal('tom');
      expect(request.path).to.equal('/graphql');
      cb(null, { firstname: 'tom', lastname: 'arnold' });
    };

    const resolvers = {
      person: getPerson
    };

    const server = new Hapi.Server();
    server.connection();
    server.register({ register: Graphi, options: { schema, resolvers } }, (err) => {
      expect(err).to.not.exist();
      const url = '/graphql?query=%7B%0A%20%20person(firstname%3A%22tom%22)%20%7B%0A%20%20%20%20lastname%0A%20%20%7D%0A%7D&variables=%7B%22hi%22%3A%20true%7D';

      server.inject({ method: 'GET', url }, (res) => {
        expect(res.statusCode).to.equal(200);
        expect(res.result.data.person.lastname).to.equal('arnold');
        done();
      });
    });
  });

  it('will handle graphql POST requests with mutations', (done) => {
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
      return new Promise((resolve) => {
        resolve({ firstname: 'billy', lastname: 'jean' });
      });
    };

    const createPerson = function (args, request) {
      expect(args.firstname).to.equal('billy');
      expect(args.lastname).to.equal('jean');
      expect(request.path).to.equal('/graphql');
      return new Promise((resolve) => {
        resolve({ firstname: 'billy', lastname: 'jean' });
      });
    };

    const resolvers = {
      createPerson,
      person: getPerson
    };

    const server = new Hapi.Server();
    server.connection();
    server.register({ register: Graphi, options: { schema, resolvers } }, (err) => {
      expect(err).to.not.exist();
      const payload = { query: 'mutation { createPerson(firstname: "billy", lastname: "jean") { lastname } }' };

      server.inject({ method: 'POST', url: '/graphql', payload }, (res) => {
        expect(res.statusCode).to.equal(200);
        expect(res.result.data.createPerson.lastname).to.equal('jean');
        done();
      });
    });
  });

  it('will handle graphql GET requests with invalid variables', (done) => {
    const schema = `
      type Person {
        firstname: String!
        lastname: String!
      }

      type Query {
        person(firstname: String!): Person!
      }
    `;

    const getPerson = function (args, request, cb) {
      expect(args.firstname).to.equal('tom');
      expect(request.path).to.equal('/graphql');
      cb(null, { firstname: 'tom', lastname: 'arnold' });
    };

    const resolvers = {
      person: getPerson
    };

    const server = new Hapi.Server();
    server.connection();
    server.register({ register: Graphi, options: { schema, resolvers } }, (err) => {
      expect(err).to.not.exist();
      const url = '/graphql?query=%7B%0A%20%20person(firstname%3A%22tom%22)%20%7B%0A%20%20%20%20lastname%0A%20%20%7D%0A%7D&variables=invalid';

      server.inject({ method: 'GET', url }, (res) => {
        expect(res.statusCode).to.equal(400);
        done();
      });
    });
  });

  it('will wrap 400 errors', (done) => {
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
      return new Promise((resolve) => {
        resolve({ firstname: 'tom', lastname: 'arnold' });
      });
    };

    const resolvers = {
      person: getPerson
    };

    const server = new Hapi.Server();
    server.connection();
    server.register({ register: Graphi, options: { schema, resolvers } }, (err) => {
      expect(err).to.not.exist();
      const url = '/graphql?query={}';

      server.inject({ method: 'GET', url }, (res) => {
        expect(res.statusCode).to.equal(400);
        done();
      });
    });
  });

  it('will wrap errors with a promise resolver', (done) => {
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
      return new Promise((resolve, reject) => {
        reject(new Error('my custom error'));
      });
    };

    const resolvers = {
      person: getPerson
    };

    const server = new Hapi.Server();
    server.connection();
    server.register({ register: Graphi, options: { schema, resolvers } }, (err) => {
      expect(err).to.not.exist();
      const url = '/graphql?query=%7B%0A%20%20person(firstname%3A%22tom%22)%20%7B%0A%20%20%20%20lastname%0A%20%20%7D%0A%7D';

      server.inject({ method: 'GET', url }, (res) => {
        expect(res.statusCode).to.equal(200);
        expect(res.result.errors).to.exist();
        done();
      });
    });
  });

  it('will wrap errors with a callback resolver', (done) => {
    const schema = `
      type Person {
        firstname: String!
        lastname: String!
      }

      type Query {
        person(firstname: String!): Person!
      }
    `;

    const getPerson = function (args, request, cb) {
      expect(args.firstname).to.equal('tom');
      expect(request.path).to.equal('/graphql');
      cb(new Error('my custom error'));
    };

    const resolvers = {
      person: getPerson
    };

    const server = new Hapi.Server();
    server.connection();
    server.register({ register: Graphi, options: { schema, resolvers } }, (err) => {
      expect(err).to.not.exist();
      const url = '/graphql?query=%7B%0A%20%20person(firstname%3A%22tom%22)%20%7B%0A%20%20%20%20lastname%0A%20%20%7D%0A%7D';

      server.inject({ method: 'GET', url }, (res) => {
        expect(res.statusCode).to.equal(200);
        expect(res.result.errors).to.exist();
        done();
      });
    });
  });

  it('will serve the GraphiQL UI', (done) => {
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
      return new Promise((resolve) => {
        resolve({ firstname: 'billy', lastname: 'jean' });
      });
    };

    const resolvers = {
      person: getPerson
    };

    const server = new Hapi.Server();
    server.connection();
    server.register({ register: Graphi, options: { schema, resolvers } }, { routes: { prefix: '/test' } }, (err) => {
      expect(err).to.not.exist();

      server.inject({ method: 'GET', url: '/test/graphiql' }, (res) => {
        expect(res.statusCode).to.equal(200);
        expect(res.result).to.contain('<html>');
        done();
      });
    });
  });

  it('will serve the GraphiQL UI prepopulated with the query', (done) => {
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
      return new Promise((resolve) => {
        resolve({ firstname: 'billy', lastname: 'jean' });
      });
    };

    const resolvers = {
      person: getPerson
    };

    const server = new Hapi.Server();
    server.connection();
    server.register({ register: Graphi, options: { schema, resolvers } }, (err) => {
      expect(err).to.not.exist();

      server.inject({ method: 'GET', url: '/graphiql?query=%7B%0A%20%20person(firstname%3A%22tom%22)%20%7B%0A%20%20%20%20lastname%0A%20%20%7D%0A%7D&variables=%7B%22hi%22%3A%20true%7D' }, (res) => {
        expect(res.statusCode).to.equal(200);
        expect(res.result).to.contain('person');
        done();
      });
    });
  });

  it('can disable GraphiQL UI', (done) => {
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
      return new Promise((resolve) => {
        resolve({ firstname: 'billy', lastname: 'jean' });
      });
    };

    const resolvers = {
      person: getPerson
    };

    const server = new Hapi.Server();
    server.connection();
    server.register({ register: Graphi, options: { schema, resolvers, graphiqlPath: false } }, (err) => {
      expect(err).to.not.exist();

      server.inject({ method: 'GET', url: '/graphiql' }, (res) => {
        expect(res.statusCode).to.equal(404);
        done();
      });
    });
  });

  it('will handle nested queries', (done) => {
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

      return new Promise((resolve) => {
        resolve([{ firstname: 'michael', lastname: 'jackson' }]);
      });
    };

    const getPerson = function (args, request) {
      expect(args.firstname).to.equal('billy');
      expect(request.path).to.equal('/graphql');

      return new Promise((resolve) => {
        resolve({ firstname: 'billy', lastname: 'jean', friends: getFriends });
      });
    };

    const resolvers = {
      person: getPerson,
      friends: getFriends
    };

    const server = new Hapi.Server();
    server.connection();
    server.register({ register: Graphi, options: { schema, resolvers } }, (err) => {
      expect(err).to.not.exist();
      const payload = {
        query: 'query GetPersonsFriend($firstname: String!, $friendsFirstname: String!) { person(firstname: $firstname) { friends(firstname: $friendsFirstname) { lastname } } }',
        variables: { firstname: 'billy', friendsFirstname: 'michael' }
      };

      server.inject({ method: 'POST', url: '/graphql', payload }, (res) => {
        expect(res.statusCode).to.equal(200);
        expect(res.result.data.person.friends[0].lastname).to.equal('jackson');
        done();
      });
    });
  });

  it('will handle invalid queries in POST request', (done) => {
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

      return new Promise((resolve) => {
        resolve([{ firstname: 'michael', lastname: 'jackson' }]);
      });
    };

    const getPerson = function (args, request) {
      expect(args.firstname).to.equal('billy');
      expect(request.path).to.equal('/graphql');

      return new Promise((resolve) => {
        resolve({ firstname: 'billy', lastname: 'jean', friends: getFriends });
      });
    };

    const resolvers = {
      person: getPerson,
      friends: getFriends
    };

    const server = new Hapi.Server();
    server.connection();
    server.register({ register: Graphi, options: { schema, resolvers } }, (err) => {
      expect(err).to.not.exist();
      const payload = {
        query: 'query GetPersonsF} }',
        variables: { firstname: 'billy', friendsFirstname: 'michael' }
      };

      server.inject({ method: 'POST', url: '/graphql', payload }, (res) => {
        expect(res.statusCode).to.equal(400);
        done();
      });
    });
  });
});
