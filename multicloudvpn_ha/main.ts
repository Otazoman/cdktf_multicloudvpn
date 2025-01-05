import { AwsProvider } from "@cdktf/provider-aws/lib/provider";
import { AzurermProvider } from '@cdktf/provider-azurerm/lib/provider';
import { GoogleProvider } from '@cdktf/provider-google/lib/provider';

// import { PrivateKey } from "@cdktf/provider-tls/lib/private-key";
// import { TlsProvider } from "@cdktf/provider-tls/lib/provider";
// import { App, TerraformOutput, TerraformStack } from "cdktf";

import { App, TerraformStack } from "cdktf";
import { Construct } from "constructs";

import { awsAzureVpnparams, awsVpcResourcesparams, awsVpnparams } from "./config/awssettings";

import { azureCommonparams, azureVnetResourcesparams, azureVpnparams } from "./config/azuresettings";
import { googleAzureVpnParams, googleVpcResourcesparams } from "./config/googlesettings";

import { awsGoogleVpnparams } from "./config/awssettings";
import { googleAwsVpnParams } from "./config/googlesettings";

// import { awsVpcResourcesparams, ec2Configs } from "./config/awssettings";
// import { azureVmsConfigparams, azureVnetResourcesparams } from "./config/azuresettings";
// import { gceInstancesParams, googleVpcResourcesparams } from "./config/googlesettings";
// import { createAwsEc2Instances } from "./resources/vmresources/awsec2";
// import { createAzureVms } from "./resources/vmresources/azurevm";
// import { createGoogleGceInstances } from "./resources/vmresources/googlegce";

import { createAwsVpcResources } from "./constructs/vpcnetwork/awsvpc";

import { createAzureVnetResources } from "./constructs/vpcnetwork/azurevnet";
import { createGoogleVpcResources } from "./constructs/vpcnetwork/googlevpc";


import { createAwsCustomerGateway } from "./constructs/vpnnetwork/awscgw";
import { createAwsVpnGateway } from "./constructs/vpnnetwork/awsvpngw";

import { createAzureLocalGateways } from "./constructs/vpnnetwork/azurelocalgwcon";
import { createAzureVpnGateway } from "./constructs/vpnnetwork/azurevpngw";
import { createGooglePeerTunnel } from "./constructs/vpnnetwork/googletunnels";
import { createGoogleVpnGateway } from "./constructs/vpnnetwork/googlevpngw";


class MultiCloudVpnStack extends TerraformStack {
  constructor(scope: Construct, id: string) {
    super(scope, id);
    /* Providers */
    // AWS Provider
    const awsProvider = new AwsProvider(this, "aws", {
      region: "ap-northeast-1",
    });
    // Google provider
    const googleProvider = new GoogleProvider(this, 'google', {
      project: 'multicloud-sitevpn-project',
      region: 'asia-northeast1',
    });
    // Azure provider
    const azureProvider = new AzurermProvider(this, 'azure', {
      features: [{}],
    });
  
    /* VPC and V-NET */
    // AWS
    const awsVpcResources = createAwsVpcResources(this, awsProvider, awsVpcResourcesparams);
    // Google
    const googleVpcResources = createGoogleVpcResources(this, googleProvider, googleVpcResourcesparams);
    // Azure
    const azureVnetResources = createAzureVnetResources(this, azureProvider, azureVnetResourcesparams);
    //createAzureVnetResources(this, azureProvider, azureVnetResourcesparams);
    
    /* VPN */
    // ToDO 環境変数がdevの場合はBGP使わずにシングル構成VPNでやる様にする

    // AWS VPNGateway
    const  awsVpnGatewayResourceparams = {
      vpcId: awsVpcResources.vpc.id,
      routeTableId: awsVpcResources.vpc.defaultRouteTableId,
      amazonSideAsn:awsVpnparams.bgpAwsAsn,
      vgwName: `${awsVpcResourcesparams.vpcName}-vgw`
    }
    const awsVpnGateway = createAwsVpnGateway(this, awsProvider, awsVpnGatewayResourceparams)

   // Google VPN Gateway(Connect Aws)
   const  GoogleVpnParams = {
    vpcNetwork: googleVpcResources.vpc.name,
    connectDestination:googleAwsVpnParams.connectDestination,
    vpnGatewayName: googleAwsVpnParams.vpnGatewayName,
    cloudRouterName: googleAwsVpnParams.cloudRouterName,
    bgpGoogleAsn: googleAwsVpnParams.bgpGoogleAsn
  }
  const googleVpnGateways = createGoogleVpnGateway(this, googleProvider,GoogleVpnParams)

  // Obtain IP address of VPNGW in Google(Connect AWS)
  const awsHaVpnGatewayIpAddresses: string[] = [];
  const awsinterfaceCount = 2 ;
  for (let index = 0; index < awsinterfaceCount; index++) {
    const interfaceObj = googleVpnGateways.vpnGateway.vpnInterfaces.get(index);
    if (interfaceObj) {
      awsHaVpnGatewayIpAddresses.push(interfaceObj.ipAddress);
    }
  }
      
  // AWS CustomerGateway (Connect Google)
  const awsGoogleCustomerGatewayParams = {
    customerGatewayName:`${awsVpcResourcesparams.vpcName}-aws-${awsGoogleVpnparams.conneectDestination}-cgw`,
    vpnConnectionName:`${awsVpcResourcesparams.vpcName}-aws-${awsGoogleVpnparams.conneectDestination}-vpn-connection`,
    conneectDestination: awsGoogleVpnparams.conneectDestination,
    awsVpnCgwProps: {
      bgpAsn: googleAwsVpnParams.bgpGoogleAsn,
      type: awsGoogleVpnparams.type
    },
    logRetentionDays: awsVpnparams.logRetentionDays,
    vpnGatewayId: awsVpnGateway.id,
    awsHaVpnGatewayIpAddresses: awsHaVpnGatewayIpAddresses
  }
  const awsGoogleCgwVpns = createAwsCustomerGateway(this, awsProvider, awsGoogleCustomerGatewayParams)

  const awsVpnConnections = awsGoogleCgwVpns.flatMap(cgw => {
    if (!cgw.vpnConnection) return [];
    const vpnConnection = cgw.vpnConnection;
    return [
      {
        address: vpnConnection.tunnel1Address,
        preshared_key: vpnConnection.tunnel1PresharedKey,
        cgw_inside_address: vpnConnection.tunnel1CgwInsideAddress,
        vgw_inside_address: vpnConnection.tunnel1VgwInsideAddress,
      },
      {
        address: vpnConnection.tunnel2Address,
        preshared_key: vpnConnection.tunnel2PresharedKey,
        cgw_inside_address: vpnConnection.tunnel2CgwInsideAddress,
        vgw_inside_address: vpnConnection.tunnel2VgwInsideAddress,
      }
    ];
  });
    
  // Google VPN tunnels and peers(AWS)
  const awsGoogleVpnParams = {
    vpnTnnelname: `${googleVpcResources.vpc.name}-gcp-aws-vpn-tunnel`,
    routerInterfaceName: `${googleVpcResources.vpc.name}-gcp-aws-router-interface`,
    routerPeerName: `${googleVpcResources.vpc.name}-gcp-aws-router-peer`,
    tunnelCount: awsGoogleCgwVpns.length *2,
    ikeVersion: googleAwsVpnParams.ikeVersion,
    routerName: googleAwsVpnParams.cloudRouterName,
    vpnGateway: {
      vpnGatewayId: googleVpnGateways.vpnGateway.id,
      peerAsn:awsVpnparams.bgpAwsAsn,
    },
    vpnConnections:awsVpnConnections,
    connectDestination: googleAwsVpnParams.connectDestination,
    externalVpnGateway: {
      name: googleAwsVpnParams.vpnGatewayName,
      interfaces: awsGoogleCgwVpns.flatMap(cgw =>
        cgw.vpnConnection ? [
          { ipAddress: cgw.vpnConnection.tunnel1Address },
          { ipAddress: cgw.vpnConnection.tunnel2Address }
      ] : []
      ),
    },
  };
  createGooglePeerTunnel(this, googleProvider, awsGoogleVpnParams);
  
  // Azure VPN Gateway
  const azureVpnGatewayResourceparams = {
    resourceGroupName: azureCommonparams.resourceGroup,
    virtualNetworkName: azureVnetResources.vnet.name,
    gatewaySubnetCidr: azureVpnparams.gatewaySubnetCidr,
    publicIpNames: azureVpnparams.publicIpNames,
    location: azureCommonparams.location,
    vpnProps: {
      type: azureVpnparams.type,
      vpnType: azureVpnparams.vpnType,
      sku: azureVpnparams.sku,
      azureAsn: azureVpnparams.azureAsn,
      pipAlloc: azureVpnparams.pipAlloc,
      awsGwIp1ip1: azureVpnparams.awsGwIp1ip1,
      awsGwIp1ip2: azureVpnparams.awsGwIp1ip2,
      awsGwIp2ip1: azureVpnparams.awsGwIp2ip1,
      awsGwIp2ip2: azureVpnparams.awsGwIp2ip2,
      googleGWip1:azureVpnparams.googleGwIp1,
      googleGWip2:azureVpnparams.googleGwIp2,
    },
    diagnosticSettings: {
      retentionInDays: azureVpnparams.retentionInDays
    },
  }
  const azureVng = createAzureVpnGateway(this, azureProvider, azureVpnGatewayResourceparams); 
  
  // AWS CustomerGateway (Connect Azure)
  const azureCustomerGatewayParams = {
    customerGatewayName:`${awsVpcResourcesparams.vpcName}-aws-${awsAzureVpnparams.conneectDestination}-cgw`,
    vpnConnectionName:`${awsVpcResourcesparams.vpcName}-aws-${awsAzureVpnparams.conneectDestination}-vpn-connection`,
    conneectDestination: awsAzureVpnparams.conneectDestination,
    awsVpnCgwProps: {
      bgpAsn: azureVpnparams.azureAsn,
      type: awsAzureVpnparams.type
    },
    vpnGatewayId: awsVpnGateway.id,
    awsHaVpnGatewayIpAddresses: azureVng.publicIpData.map(pip => pip.ipAddress),
    azureVpnProps: {
      awsGwIpCidr1: azureVpnparams.awsGwIp1Cidr,
      awsGwIpCidr2: azureVpnparams.awsGwIp2Cidr,
    },
    logRetentionDays: azureVpnparams.retentionInDays,
  }
  const awsAzureCgwVpns = createAwsCustomerGateway(this, awsProvider, azureCustomerGatewayParams)
    
  // Azure localGateway and tunnels(Connect AWS)
  const awsAzureVpnTunnels = awsAzureCgwVpns.flatMap((cgw, index) => {
    if (!cgw.vpnConnection) return [];
    const tunnelIndex = index + 1;
    return [
      {
        address: cgw.vpnConnection.tunnel1Address,
        shared_key: cgw.vpnConnection.tunnel1PresharedKey,
        cidrhost: (azureVpnparams as any)[`azureAwsGwIp${tunnelIndex}ip1`],
      },
      {
        address: cgw.vpnConnection.tunnel2Address,
        shared_key: cgw.vpnConnection.tunnel2PresharedKey,
        cidrhost: (azureVpnparams as any)[`azureAwsGwIp${tunnelIndex}ip2`],
      }
    ];
  }).filter(tunnel => tunnel !== null);
    
  // Azure Local Gateway のパラメータを構築(AWS)
  const awsAzureLocalGatewayParams = {
    resourceGroupName: azureCommonparams.resourceGroup,
    location: azureCommonparams.location,
    virtualNetworkGatewayId: azureVng.virtualNetworkGateway.id,
    vpnConnectionType: azureVpnparams.vpnConnectionType,
    tunnels: awsAzureVpnTunnels.map((tunnel, _index) => ({
      localNetworkGatewayName: `${azureVnetResources.vnet.name}-aws-lng`,
      localGatewayAddress: tunnel.address,
      localAddressSpaces: [awsVpcResourcesparams.vpcCidrBlock],
      sharedKey: tunnel.shared_key,
      bgpSettings: {
        asn: awsVpnparams.bgpAwsAsn,
        bgpPeeringAddress: tunnel.cidrhost
      }
    }))
  };
  
  // Azure Local Gateway の作成(AWS)
  createAzureLocalGateways(this, azureProvider, awsAzureLocalGatewayParams);
    
  // Google VPN Gateway(Connect Azure)
  const azureVpnConnections = azureVng.publicIpData.flatMap(pip => [
      {
        vgw_inside_address: pip.ipAddress,
        cgw_inside_address:azureVpnGatewayResourceparams.vpnProps.googleGWip1,
        preshared_key: azureVpnparams.presharedKey,
      },
      {
        vgw_inside_address: pip.ipAddress,
        cgw_inside_address:azureVpnGatewayResourceparams.vpnProps.googleGWip2,
        preshared_key: azureVpnparams.presharedKey,
      }
  ]);    

  const  GoogleAzureVpnParams = {
    vpcNetwork: googleVpcResources.vpc.name,
    connectDestination:googleAzureVpnParams.connectDestination,
    vpnGatewayName: googleAzureVpnParams.vpnGatewayName,
    cloudRouterName: googleAzureVpnParams.cloudRouterName,
    bgpGoogleAsn: googleAzureVpnParams.bgpGoogleAsn
  }
  const googleAzureVpnGateways = createGoogleVpnGateway(this, googleProvider,GoogleAzureVpnParams)

  // Obtain IP address of VPNGW in Google(Azure)
  const azureHaVpnGatewayIpAddresses: string[] = [];
  const azureinterfaceCount = 2 ;
  for (let index = 0; index < azureinterfaceCount; index++) {
    const interfaceObj = googleAzureVpnGateways.vpnGateway.vpnInterfaces.get(index);
    if (interfaceObj) {
      azureHaVpnGatewayIpAddresses.push(interfaceObj.ipAddress);
    }
  }
    
  // Google VPN tunnels and peers(Azure)
  const azureGoogleVpnParams = {
    vpnTnnelname: `${googleVpcResources.vpc.name}-gcp-azure-vpn-tunnel`,
    routerInterfaceName: `${googleVpcResources.vpc.name}-gcp-azure-router-interface`,
    routerPeerName: `${googleVpcResources.vpc.name}-gcp-azure-router-peer`,
    tunnelCount: 2,
    routerName: googleAzureVpnParams.cloudRouterName,
    vpnGateway: {
      vpnGatewayId: googleAzureVpnGateways.vpnGateway.id,
      peerAsn:azureVpnparams.azureAsn,
    },

    awsHaVpnGatewayIpAddresses: azureVng.publicIpData.map(pip => pip.ipAddress),
    vpnConnections: azureVpnConnections,
    connectDestination: googleAzureVpnParams.connectDestination,
    externalVpnGateway: {
      name: googleAzureVpnParams.vpnGatewayName,
      interfaces: azureVng.publicIpData.map(pip => ({ ipAddress: pip.ipAddress })),
    },
  };
  createGooglePeerTunnel(this, googleProvider, azureGoogleVpnParams);    
    
    
    // Azure localGateway and tunnels(Connect google)
    const googleAzureVpnTunnels = [];
    const vpninterfacesCount = Number(googleAzureVpnGateways.vpnGateway.vpnInterfaces.fqn.split('.').pop());

    for (let index = 0; index < vpninterfacesCount; index++) {
      const interfaceObj = googleAzureVpnGateways.vpnGateway.vpnInterfaces.get(index);
      
      if (interfaceObj && interfaceObj.ipAddress) {
        googleAzureVpnTunnels.push({
          address: interfaceObj.ipAddress,
          shared_key: azureVpnparams.presharedKey,
          cidrhost: index === 0 ? azureVpnparams.googlePerrIp1 : azureVpnparams.googlePeerIp2,
        });
      }
    }
    
  // Azure Local Gateway のパラメータを構築(google)
  const googleAzureLocalGatewayParams = {
    resourceGroupName: azureCommonparams.resourceGroup,
    location: azureCommonparams.location,
    virtualNetworkGatewayId: azureVng.virtualNetworkGateway.id,
    vpnConnectionType: azureVpnparams.vpnConnectionType,
    tunnels: googleAzureVpnTunnels.map((tunnel, _index) => ({
      localNetworkGatewayName: `${azureVnetResources.vnet.name}-google-lng`,
      localGatewayAddress: tunnel.address,
      localAddressSpaces: [azureVnetResourcesparams.vnetAddressSpace],
      sharedKey: tunnel.shared_key,
      bgpSettings: {
        asn: azureVpnparams.azureAsn,
        bgpPeeringAddress: tunnel.cidrhost
      }
    }))
  };
    // Azure Local Gateway の作成(google)
  createAzureLocalGateways(this, azureProvider, googleAzureLocalGatewayParams);
    

    
    //     /* VMInstances */
    //     // AWS
    //     const ec2InstancesParams = {
    //       instanceConfigs: ec2Configs,
    //       subnetIds: awsVpcResources.subnets.map(subnet => subnet.id),
    //       securityGroupId: awsVpcResources.securityGroup.id,
    //     };
    //     createAwsEc2Instances(this, awsProvider, ec2InstancesParams);

    //     // Google
    //     createGoogleGceInstances(this, googleProvider, gceInstancesParams,googleVpcResources.vpc,googleVpcResources.subnets);
    
    //     // Azure
    //     // ssh-key
    //     const tlsProvider = new TlsProvider(this, "tls", {});
    //     const sshKey = new PrivateKey(this, "ssh-key", {
    //       algorithm: "RSA",
    //       rsaBits: 4096,
    //       provider: tlsProvider,
    //     });

    //     new TerraformOutput(this, "ssh_private_key_output", {
    //       value: sshKey.privateKeyPem,
    //       sensitive: true,
    //     });

    //     // Azure-VM
    //     const azureVmParams = {
    //       vnetName: azureVnetResources.vnet.name,
    //       subnetNames: Object.fromEntries(
    //         Object.entries(azureVnetResources.subnets).map(([key, subnet]) => [key, subnet.name])
    //       ),
    //       vmConfigs: azureVmsConfigparams,
    //       sshKey:sshKey,
    //     };
    //     createAzureVms(this, azureProvider, azureVmParams);

    //   }
    // }

  }
}
const app = new App();
new MultiCloudVpnStack(app, "app");
app.synth();