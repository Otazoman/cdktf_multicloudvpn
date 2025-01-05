
/* VPC */
export const awsVpcResourcesparams = {
    vpcCidrBlock: '10.0.0.0/16',
    vpcName: 'my-aws-vpc',
    subnets: [
      { cidrBlock: '10.0.10.0/24', az: 'ap-northeast-1a', name: 'my-aws-vpc-subnet1' },
      { cidrBlock: '10.0.20.0/24', az: 'ap-northeast-1c', name: 'my-aws-vpc-subnet2' },
      { cidrBlock: '10.0.30.0/24', az: 'ap-northeast-1d', name: 'my-aws-vpc-subnet3' },
    ],
    securityGroupName: 'my-aws-vpc-sg',
    allowedPorts: [0],
    allowprotocol: '-1',
    ingressCidrBlocks: ['10.0.0.0/16', '10.1.0.0/16', '10.2.0.0/16'],
    description: 'Other Cloud allow',
    defaultRouteTableName: 'my-aws-vpc-routetable',
}
/* VPN */
export const awsVpnparams = {
  bgpAwsAsn: 64512,
  logRetentionDays: 14,
}
export const awsGoogleVpnparams = {
  conneectDestination: 'google',
  redundancyType: "FOUR_IPS_REDUNDANCY",
  type: 'ipsec.1',
}
export const awsAzureVpnparams = {
  conneectDestination: 'azure',
  type: 'ipsec.1',
}

/* EC2 */
export const ec2Configs = [
    {
      ami: 'ami-0b20f552f63953f0e',
      instanceType: 't3.micro',
      keyName: 'multicloud_test',
      tags: {
        Name: 'MyEC2Instance1',
      },
    },
    // {
    //   ami: 'ami-0b20f552f63953f0e',
    //   instanceType: 't3.small',
    //   keyName: 'multicloud_test',
    //   tags: {
    //     Name: 'MyEC2Instance2',
    //   },
    // },
];   
