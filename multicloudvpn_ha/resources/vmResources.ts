import { AwsProvider } from "@cdktf/provider-aws/lib/provider";
import { AzurermProvider } from "@cdktf/provider-azurerm/lib/provider";
import { GoogleProvider } from "@cdktf/provider-google/lib/provider";
import { Token } from "cdktf";
import { Construct } from "constructs";
import { ec2Building, ec2Configs } from "../config/awssettings";
import { azureVmsConfigparams, vmBuilding } from "../config/azuresettings";
import {
  awsToAzure,
  awsToGoogle,
  googleToAzure,
} from "../config/commonsettings";
import { gceBuilding, gceInstancesParams } from "../config/googlesettings";
import { createAwsEc2Instances } from "../constructs/vmresources/awsec2";
import { createAzureVms } from "../constructs/vmresources/azurevm";
import { createGoogleGceInstances } from "../constructs/vmresources/googlegce";

// Define interfaces for the VPC resources
interface AwsVpcResources {
  vpc: { id: string };
  subnets: { id: string }[];
  securityGroups: { id: string; name: string }[];
  securityGroupMapping: { [key: string]: Token };
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
  sshKey: any,
  vpnResources: any
) => {
  if ((awsToAzure || awsToGoogle) && ec2Building) {
    //AWS EC2 Instances
    const getSecurityGroupId = (name: string): string => {
      if (
        awsVpcResources.securityGroupMapping &&
        typeof awsVpcResources.securityGroupMapping === "object"
      ) {
        const securityGroupId = awsVpcResources.securityGroupMapping[name];
        if (securityGroupId) {
          console.log(
            `Found security group with ID: ${Token.asString(securityGroupId)}`
          );
          return Token.asString(securityGroupId);
        } else {
          console.log(`No security group found for name: ${name}`);
          return "default-security-group-id";
        }
      } else {
        console.log("securityGroupMapping is not properly defined");
        return "default-security-group-id";
      }
    };

    const awsEc2Instances = createAwsEc2Instances(scope, awsProvider, {
      instanceConfigs: ec2Configs.map((config) => {
        const { securityGroupNames, ...restConfig } = config;

        return {
          ...restConfig,
          securityGroupIds: securityGroupNames
            .map((name) => getSecurityGroupId(name))
            .filter((id): id is string => id !== undefined),
        };
      }),
      subnetIds: awsVpcResources.subnets.map((subnet) => subnet.id),
    });

    awsEc2Instances.forEach((instance) =>
      instance.node.addDependency(vpnResources.awsVpnGateway, awsVpcResources)
    );

    if ((awsToGoogle || googleToAzure) && gceBuilding) {
      // Google GCE Instances
      const googleGceInstances = createGoogleGceInstances(
        scope,
        googleProvider,
        gceInstancesParams,
        googleVpcResources.vpc,
        googleVpcResources.subnets
      );
      googleGceInstances.forEach((instance) =>
        instance.node.addDependency(
          vpnResources.googleVpnGateways,
          googleVpcResources
        )
      );
    }

    if ((awsToAzure || googleToAzure) && vmBuilding) {
      // Azure VMs
      const azureVmParams = {
        vnetName: azureVnetResources.vnet.name,
        subnetNames: Object.fromEntries(
          Object.entries(azureVnetResources.subnets).map(([key, subnet]) => [
            key,
            subnet.name,
          ])
        ),
        vmConfigs: azureVmsConfigparams,
        sshKey: sshKey,
      };
      const azureVms = createAzureVms(scope, azureProvider, azureVmParams);
      azureVms.forEach((vm) =>
        vm.node.addDependency(vpnResources.azureVng, azureVnetResources)
      );
    }
  }
};
