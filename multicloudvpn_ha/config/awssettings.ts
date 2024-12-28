
/* VPC */
export const awsVpcResourcesparams = {
    vpcCidrBlock: '10.0.0.0/16',
    vpcName: 'cdktf-devio-vpc',
    subnets: [
      { cidrBlock: '10.0.1.0/24', az: 'ap-northeast-1a', name: 'cdktf-devio-subnet1' },
      { cidrBlock: '10.0.2.0/24', az: 'ap-northeast-1c', name: 'cdktf-devio-subnet2' },
      { cidrBlock: '10.0.3.0/24', az: 'ap-northeast-1d', name: 'cdktf-devio-subnet3' },
    ],
    securityGroupName: 'cdktf-devio-sg',
    allowedPorts: [0],
    allowprotocol: "-1",
    ingressCidrBlocks: ["10.0.1.0/24", "10.0.2.0/24"],
    defaultRouteTableName: 'cdktf-devio-routetable',
}
/* VPN */
export const awsVpnparams = { bgpAwsAsn : 64512 }
export const awsGoogleVpnparams = {
  conneectDestination: "google",
  type: "ipsec.1",
}


/* EC2 */
export const ec2Configs = [
    {
      ami: "ami-0b20f552f63953f0e",
      instanceType: "t3.micro",
      keyName: "multicloud_test",
      tags: {
        Name: "MyEC2Instance1",
      },
    },
    // {
    //   ami: "ami-0b20f552f63953f0e",
    //   instanceType: "t3.small",
    //   keyName: "multicloud_test",
    //   tags: {
    //     Name: "MyEC2Instance2",
    //   },
    // },
];   
