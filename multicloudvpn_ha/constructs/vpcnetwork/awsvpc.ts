import { DefaultRouteTable } from "@cdktf/provider-aws/lib/default-route-table";
import { AwsProvider } from "@cdktf/provider-aws/lib/provider";
import { SecurityGroup } from "@cdktf/provider-aws/lib/security-group";
import { Subnet } from "@cdktf/provider-aws/lib/subnet";
import { Vpc as AwsVpc } from "@cdktf/provider-aws/lib/vpc";
import { Construct } from "constructs";

interface SubnetConfig {
  cidrBlock: string;
  az: string;
  name: string;
}

interface AwsResourcesParams {
  vpcCidrBlock: string;
  vpcName: string;
  subnets: SubnetConfig[];
  securityGroupName: string;
  allowedPorts: number[];
  ingressCidrBlocks: string[];
  allowprotocol: string;
  description: string;
  defaultRouteTableName: string;
}

export function createAwsVpcResources(
  scope: Construct,
  provider: AwsProvider,
  params: AwsResourcesParams
) {
  // vpc
  const vpc = new AwsVpc(scope, "awsVpc", {
    provider: provider,
    cidrBlock: params.vpcCidrBlock,
    enableDnsHostnames: true,
    enableDnsSupport: true,
    tags: {
      Name: params.vpcName,
    },
  });

  // subnets
  const subnets = params.subnets.map((subnetConfig, index) => {
    return new Subnet(scope, `awsSubnet${index}`, {
      provider: provider,
      vpcId: vpc.id,
      cidrBlock: subnetConfig.cidrBlock,
      availabilityZone: subnetConfig.az,
      tags: {
        Name: subnetConfig.name,
      },
    });
  });

  // securitygroup
  const securityGroup = new SecurityGroup(scope, "awsSecurityGroup", {
    provider: provider,
    vpcId: vpc.id,
    ingress: params.allowedPorts.map((port) => ({
      fromPort: port,
      toPort: port,
      protocol: params.allowprotocol,
      cidrBlocks: params.ingressCidrBlocks,
      description: params.description,
    })),
    egress: [
      {
        fromPort: 0,
        toPort: 0,
        protocol: "-1",
        cidrBlocks: ["0.0.0.0/0"],
      },
    ],
    tags: {
      Name: params.securityGroupName,
    },
  });

  // routetable
  new DefaultRouteTable(scope, "defaultRouteTable", {
    provider: provider,
    defaultRouteTableId: vpc.defaultRouteTableId,
    tags: {
      Name: params.defaultRouteTableName,
    },
  });

  return { vpc, subnets, securityGroup };
}
