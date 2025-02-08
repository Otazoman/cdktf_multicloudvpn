/* VPC */
const vpcName = "my-gcp-vpc";

export const googleVpcResourcesparams = {
  vpcName: vpcName,
  vpcCidrblock: "10.1.0.0/16",
  subnets: [
    { name: "subnet1", cidr: "10.1.10.0/24", region: "asia-northeast1" },
    { name: "subnet2", cidr: "10.1.20.0/24", region: "asia-northeast1" },
  ],
  firewallIngressRules: [
    {
      name: "internal-aws-rule",
      sourceRanges: ["10.0.0.0/16"],
      priority: 1000,
    },
    {
      name: "internal-google-rule",
      sourceRanges: ["10.1.0.0/16"],
      priority: 1000,
    },
    {
      name: "internal-azure-rule",
      sourceRanges: ["10.2.0.0/16"],
      priority: 1000,
    },
  ],
  firewallEgressRules: [
    {
      name: "vpn-rule",
      sourceRanges: ["0.0.0.0/0"],
      destinationRanges: ["0.0.0.0/0"],
      priority: 1000,
    },
  ],
};
/* VPN */
export const googleAwsVpnParams = {
  connectDestination: "aws",
  vpnGatewayName: "aws-google-vpngateway",
  cloudRouterName: "aws-google-cloud-router",
  bgpGoogleAsn: 65000,
  externalGatewayName: "aws-external-gateway",
  ikeVersion: 2,
};

export const googleAzureVpnParams = {
  connectDestination: "azure",
  vpnGatewayName: "azure-google-vpngateway",
  cloudRouterName: "azure-google-cloud-router",
  bgpGoogleAsn: 65000,
  externalGatewayName: "azure-external-gateway",
  ikeVersion: 2,
};

export const createGoogleVpnPeerParams = (
  connectDestination: string,
  tunnelCount: number,
  ikeVersion: number,
  routerName: string,
  vpnGateway: any,
  externalVpnGateway: any,
  vpnConnections: any
) => ({
  connectDestination: connectDestination,
  vpnTnnelname: `${vpcName}-gcp-${connectDestination}-vpn-tunnel`,
  routerInterfaceName: `${vpcName}-gcp-${connectDestination}-router-interface`,
  routerPeerName: `${vpcName}-gcp-${connectDestination}-router-peer`,
  tunnelCount: tunnelCount,
  ikeVersion: ikeVersion,
  routerName: routerName,
  vpnGateway: vpnGateway,
  externalVpnGateway: externalVpnGateway,
  vpnConnections: vpnConnections,
});

/* GCE */
const serviceAccountScopes = [
  "https://www.googleapis.com/auth/devstorage.read_only",
  "https://www.googleapis.com/auth/logging.write",
  "https://www.googleapis.com/auth/monitoring.write",
  "https://www.googleapis.com/auth/servicecontrol",
  "https://www.googleapis.com/auth/service.management.readonly",
  "https://www.googleapis.com/auth/trace.append",
];

export const gceBuilding = true;
export const gceInstancesParams = {
  project: "multicloud-sitevpn-project",
  instanceConfigs: [
    {
      name: "gce-instance-1",
      machineType: "e2-micro",
      zone: "asia-northeast1-a",
      tags: ["multicloud"],
      bootDiskImage:
        "projects/ubuntu-os-cloud/global/images/ubuntu-2404-noble-amd64-v20240701a",
      bootDiskSize: 10,
      bootDiskType: "pd-standard",
      bootDiskDeviceName: "test-instance1-boot-disk",
      subnetworkName: "subnet1",
      serviceAccountScopes: serviceAccountScopes,
    },
    // {
    //   name: 'gce-instance-2',
    //   machineType: 'e2-micro',
    //   zone: 'asia-northeast1-b',
    //   tags: ['multicloud'],
    //   bootDiskImage: 'projects/ubuntu-os-cloud/global/images/ubuntu-2404-noble-amd64-v20240701a',
    //   bootDiskSize: 10,
    //   bootDiskType: 'pd-standard',
    //   bootDiskDeviceName: 'test-instance2-boot-disk',
    //   subnetworkName: 'subnet2',
    //   serviceAccountScopes: serviceAccountScopes,
    // },
  ],
  vpcName: vpcName,
};
