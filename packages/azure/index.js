
const AzureCommon = Npm.require("azure-common");
const Dns = Npm.require("azure-arm-dns");
const Adal = Npm.require("adal-node");


Azure = {};

if (!Meteor.settings.azure ||
    !Meteor.settings.azure.AZURE_CLIENT_ID ||
    !Meteor.settings.azure.AZURE_SHARED_KEY ||
    !Meteor.settings.azure.AZURE_TENANT_ID ||
    !Meteor.settings.azure.AZURE_SUBSCRIPTION_ID ||
    !Meteor.settings.azure.AZURE_DNS_RESOURCE_GROUP_NAME ||
    !Meteor.settings.azure.AZURE_DNS_ZONE_NAME
  ) {
    throw new Meteor.Error("Azure api credientials are missing");
}

const clientId = Meteor.settings.azure.AZURE_CLIENT_ID,
      key = Meteor.settings.azure.AZURE_SHARED_KEY,
      resourceURI = "https://management.azure.com/",
      authority = `https://login.microsoftonline.com/${Meteor.settings.azure.AZURE_TENANT_ID}`,
      resourceGroupName = Meteor.settings.azure.AZURE_RESOURCE_GROUP_NAME,
      dnsZoneName = Meteor.settings.azure.AZURE_DNS_ZONE_NAME;

Azure.token = {};
Azure.token.get = (cb) => {
  let context = new Adal.AuthenticationContext(authority, false);
  context.acquireTokenWithClientCredentials(resourceURI, clientId, key, cb);
}

Azure.token.print = () => {
  Azure.token.get((err, result) => {
    console.log(result.accessToken);
  });
}


Azure.cname = {};
Azure.cname.create = function createCNAME(cname, url) {
  check(cname, String);
  check(url, String);

  Azure.token.get((err, result) => {

    if (err) {
      throw new Error(`Unable to authenticate: ${err.stack}`);
    }

    let credentials = new AzureCommon.TokenCloudCredentials({
      subscriptionId: Meteor.settings.azure.AZURE_SUBSCRIPTION_ID,
      token: result.accessToken
    });

    let dnsClient = Dns.createDnsManagementClient(credentials, resourceURI);

    let cnameParams = {
      recordSet: {
        properties: {
          cnameRecord: {
            cname: url
          },
          ttl: 300
        },
        location: "global"
      }
    };

    dnsClient.recordSets.createOrUpdate(
      resourceGroupName,
      dnsZoneName,
      cname,
      "CNAME",
      cnameParams,
      (err, result) => {

      if (err) {
        throw new Error(`Unable to create CNAME: ${err.stack}`);
      }

      console.log(result);
    });

  });

}
