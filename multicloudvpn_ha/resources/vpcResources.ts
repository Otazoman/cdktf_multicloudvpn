import { AwsProvider } from '@cdktf/provider-aws/lib/provider';
import { AzurermProvider } from '@cdktf/provider-azurerm/lib/provider';
import { GoogleProvider } from '@cdktf/provider-google/lib/provider';
import { Construct } from 'constructs';
import { awsVpcResourcesparams } from '../config/awssettings';
import { azureVnetResourcesparams } from '../config/azuresettings';
import { googleVpcResourcesparams } from '../config/googlesettings';
import { createAwsVpcResources } from '../constructs/vpcnetwork/awsvpc';
import { createAzureVnetResources } from '../constructs/vpcnetwork/azurevnet';
import { createGoogleVpcResources } from '../constructs/vpcnetwork/googlevpc';

export const createVpcResources = (scope: Construct, awsProvider: AwsProvider, googleProvider: GoogleProvider, azureProvider: AzurermProvider) => {
  const awsVpcResources = createAwsVpcResources(scope, awsProvider, awsVpcResourcesparams);
  const googleVpcResources = createGoogleVpcResources(scope, googleProvider, googleVpcResourcesparams);
  const azureVnetResources = createAzureVnetResources(scope, azureProvider, azureVnetResourcesparams);

  return { awsVpcResources, googleVpcResources, azureVnetResources };
};