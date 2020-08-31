import 'dotenv/config';
import express from 'express';
import axios from 'axios';
import qs from 'querystring';
import { ApolloServer, gql } from 'apollo-server-express';
import { ApolloError } from 'apollo-server';
import { GraphQLJSON, GraphQLJSONObject } from 'graphql-type-json';
import { exec } from 'child_process';

const app = express();

const schema = gql`
  scalar JSON
  scalar JSONObject

  type Query {
    me: User
    siteInfo(site: String!): SiteInfo
  }

  type User {
    username: String!
  }

  type SiteInfo {
    siteName: String
    databaseHost: String
    databasePrefix: String
    databaseName: String
    siteProperties: JSONObject
  }
`;
const resolvers = {
  JSON: GraphQLJSON,
  JSONObject: GraphQLJSONObject,
  Query: {
    me: () => {
      return {
        username: async () => await queryUsername(),
      };
    },
    siteInfo: async (root, { site }) => {
      const properties = await fetchSite(site);
      console.log('Got ', site, 'for siteInfo()');
      return {
        siteName: site,
        databaseHost: properties['databaseHost'],
        databasePrefix: properties['databasePrefix'],
        databaseName: properties['databaseName'],
        siteProperties: async () => await fetchSite(site),
        originalSoftwareType: async () => await figureOutSoftwareType(site),
      };
    },
  },
};

// const FETCH_SITE = 'https://sitesadmin.vscopedev.cloud/api/fetchSite';
const FETCH_SITE = 'https://sitesadmin.vscope.cloud/api/fetchSite';

// const SITESADMIN_API_KEY = 'asdfghzxcv1234';
const SITESADMIN_API_KEY = 'dh@jfDFDD23423SDd!@!';

const fetchSite = async (sitename, field) => {
  try {
    const response = await axios.post(
      FETCH_SITE,
      qs.stringify({
        sitename,
      }),
      {
        headers: {
          apiKey: SITESADMIN_API_KEY,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      },
    );

    if (response.data && response.data.status) {
      const message = JSON.parse(response.data.message);
      if (field) {
        return message[field];
      } else {
        return message;
      }
    }
  } catch (err) {
    throw err;
  }
};

const queryDatabaseHost = async (sitename) => {
  try {
    const value = await fetchSite(sitename, 'databaseHost');
    return value;
  } catch (err) {
    throw new ApolloError(
      'Unable to contact SitesAdmin',
      'SITES_ADMIN_UNAVAILABLE',
    );
  }
};
const queryUsername = async () => {
  return new Promise((resolve, reject) => {
    exec('whoami', (error, stdout, stderr) => {
      if (error) {
        console.warn(error);
      }
      resolve((stdout ? stdout : stderr).trim('\n'));
    });
  });
};

const server = new ApolloServer({
  typeDefs: schema,
  resolvers,
});

server.applyMiddleware({
  app,
  path: process.env.GRAPHQL_PATH,
});

app.listen({ port: process.env.PORT }, () => {
  console.log(
    `Apollo Server on http://localhost:${process.env.PORT}${process.env.GRAPHQL_PATH}`,
  );
});
