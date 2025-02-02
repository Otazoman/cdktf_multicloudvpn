import { AwsProvider } from "@cdktf/provider-aws/lib/provider";
import { AzurermProvider } from '@cdktf/provider-azurerm/lib/provider';
import { GoogleProvider } from '@cdktf/provider-google/lib/provider';
import { Construct } from "constructs";
import { ec2Configs } from "../config/awssettings";
import { azureVmsConfigparams } from "../config/azuresettings";
import { gceInstancesParams } from "../config/googlesettings";
import { createAwsEc2Instances } from "../constructs/vmresources/awsec2";
import { createAzureVms } from "../constructs/vmresources/azurevm";
import { createGoogleGceInstances } from "../constructs/vmresources/googlegce";

// Define interfaces for the VPC resources
interface AwsVpcResources {
  subnets: { id: string }[];
  securityGroup: { id: string };
}

interface AzureVnetResources {
  vnet: { name: string };
  subnets: Record<string, { name: string }>;
}

export const createVmResources = (
  scope: Construct,
  awsProvider: AwsProvider,
  googleProvider: GoogleProvider,
  azureProvider: AzurermProvider,
  awsVpcResources: AwsVpcResources,
  googleVpcResources: any,
  azureVnetResources: AzureVnetResources,
  sshKey: any
) => {
  // AWS EC2 Instances
  createAwsEc2Instances(scope, awsProvider, {
    instanceConfigs: ec2Configs,
    subnetIds: awsVpcResources.subnets.map(subnet => subnet.id),
    securityGroupId: awsVpcResources.securityGroup.id,
  });

  // Google GCE Instances
  createGoogleGceInstances(scope, googleProvider, gceInstancesParams, googleVpcResources.vpc, googleVpcResources.subnets);

  // Azure VMs
  createAzureVms(scope, azureProvider, {
    vnetName: azureVnetResources.vnet.name,
    subnetNames: Object.fromEntries(
      Object.entries(azureVnetResources.subnets).map(([key, subnet]) => [key, subnet.name])
    ),
    vmConfigs: azureVmsConfigparams,
    sshKey: sshKey,
  });
};
