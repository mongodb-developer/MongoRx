import {NgModule} from '@angular/core';
import {APOLLO_OPTIONS} from 'apollo-angular';
import {ApolloClientOptions, InMemoryCache, ApolloLink} from '@apollo/client/core';
import {HttpLink} from 'apollo-angular/http';
import {HttpClient, HttpHeaders, HttpXhrBackend} from '@angular/common/http';
import { environment } from '../environments/environment';

const login: string = 'https://us-east-1.aws.realm.mongodb.com/api/client/v2.0/app/clintrialgql-vfmul/auth/providers/local-userpass/login';
const uri = 'https://us-east-1.aws.realm.mongodb.com/api/client/v2.0/app/clintrialgql-vfmul/graphql'; // <-- add the URL of the GraphQL server here
export function createApollo(httpLink: HttpLink): ApolloClientOptions<any> {
  // get OAuth token
  const httpClient = new HttpClient(new HttpXhrBackend({ build: () => new XMLHttpRequest() }));
  let accessToken: string, refreshToken: string;
  let response: any;

  // TODO: add local token expiration logic
  httpClient.post(login, {
      "username": environment.graphQLusername,
      "password": environment.graphQLpassword
  }).subscribe(data => {
    if (data) {
      response = data;
      console.log(`Login response: ${JSON.stringify(response, null, 2)}`);
      localStorage.setItem("accessToken", response.access_token);
      let now = new Date();
      // Realm access tokens expire after 30 minutes
      localStorage.setItem("expiresOn", new Date(now.getTime() + 30*60000).toISOString());
      localStorage.setItem("refreshToken", response.refresh_token);
    }
  });

  // based on example from https://apollo-angular.com/docs/data/network#middleware
  const http = httpLink.create({uri});
  const middleware = new ApolloLink((operation, forward) => {
    let accessToken;
    if (response?.access_token) {
      accessToken = response.access_token;
    } else {
      let expiresOn, expiresOnDate;
      expiresOn = localStorage.getItem("expiresOn");
      if (expiresOn) {
        console.log(`Access token expires on ${expiresOn}`);
        expiresOnDate = new Date(expiresOn);
        let now = new Date();
        if (expiresOnDate.getTime() > now.getTime()) {
          accessToken = localStorage.getItem("accessToken");
          console.log("Using access token from local storage");
        } else {
          // refresh token
          console.log("Access token from local storage expired");
        }
      }
    }

    operation.setContext({
      headers: new HttpHeaders()
        //.set("email", "demo@gmail.com")
        //.set("password", "Passw0rd")
        .set("authorization", "Bearer " + accessToken)
    });
    return forward(operation);
  });
  const link = middleware.concat(http);
  return {
    link,
    cache: new InMemoryCache()
  };
}

@NgModule({
  providers: [
    {
      provide: APOLLO_OPTIONS,
      useFactory: createApollo,
      deps: [HttpLink],
    },
  ],
})
export class GraphQLModule {
  constructor(private http: HttpClient) {}
}
