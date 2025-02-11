/* VPC */
export const awsVpcResourcesparams = {
  vpcCidrBlock: "10.0.0.0/16",
  vpcName: "my-aws-vpc",
  subnets: [
    {
      cidrBlock: "10.0.10.0/24",
      az: "ap-northeast-1a",
      name: "my-aws-vpc-subnet1",
    },
    {
      cidrBlock: "10.0.20.0/24",
      az: "ap-northeast-1c",
      name: "my-aws-vpc-subnet2",
    },
    {
      cidrBlock: "10.0.30.0/24",
      az: "ap-northeast-1d",
      name: "my-aws-vpc-subnet3",
    },
  ],
  securityGroups: [
    {
      name: "my-aws-vpc-sg1",
      ingress: [
        {
          fromPort: 0,
          toPort: 0,
          protocol: "-1",
          cidrBlocks: ["10.0.0.0/16", "10.1.0.0/16", "10.2.0.0/16"],
          description: "Allow all inbound traffic",
        },
      ],
      egress: [
        {
          fromPort: 0,
          toPort: 0,
          protocol: "-1",
          cidrBlocks: ["0.0.0.0/0"],
          ipv6CidrBlocks: ["::/0"],
          description: "Allow all outbound traffic",
        },
      ],
    },
    {
      name: "EC2InstanceConnect",
      ingress: [
        {
          fromPort: 22,
          toPort: 22,
          protocol: "tcp",
          cidrBlocks: ["0.0.0.0/0"],
          description: "EC2 Instance Connect",
        },
      ],
      egress: [
        {
          fromPort: 0,
          toPort: 0,
          protocol: "-1",
          cidrBlocks: ["0.0.0.0/0"],
          ipv6CidrBlocks: ["::/0"],
          description: "Allow all outbound traffic",
        },
      ],
    },
  ],
  defaultRouteTableName: "my-aws-vpc-routetable",
  ec2ICEndpoint: {
    endpointName: "my-ec2-instance-connect-endpoint",
    securityGroupNames: ["EC2InstanceConnect"],
  },
};
/* VPN */
export const awsVpnparams = {
  bgpAwsAsn: 64512,
  logRetentionDays: 14,
};

export const createCustomerGatewayParams = (
  conneectDestination: string,
  bgpAsn: number,
  vpnGatewayId: any,
  haIpAddresses: string[]
) => ({
  customerGatewayName: `${awsVpcResourcesparams.vpcName}-aws-${conneectDestination}-cgw`,
  vpnConnectionName: `${awsVpcResourcesparams.vpcName}-aws-${conneectDestination}-vpn-connection`,
  conneectDestination: conneectDestination,
  awsVpnCgwProps: {
    bgpAsn: bgpAsn,
    type: "ipsec.1",
  },
  logRetentionDays: awsVpnparams.logRetentionDays,
  vpnGatewayId: vpnGatewayId,
  awsHaVpnGatewayIpAddresses: haIpAddresses,
});

/* EC2 */
export const ec2Building = true;
export const ec2Configs = [
  {
    ami: "ami-0b20f552f63953f0e",
    instanceType: "t3.micro",
    keyName: "multicloud_test",
    tags: {
      Name: "MyEC2Instance1",
    },
    securityGroupNames: ["my-aws-vpc-sg1"],
  },
  // {
  //   ami: "ami-0b20f552f63953f0e",
  //   instanceType: "t3.small",
  //   keyName: "multicloud_test",
  //   tags: {
  //     Name: "MyEC2Instance2",
  //   },
  //   securityGroupNames: ["EC2InstanceConnect"],
  // },
];
