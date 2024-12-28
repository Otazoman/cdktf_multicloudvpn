import { AwsProvider } from "@cdktf/provider-aws/lib/provider";
import { GoogleProvider } from '@cdktf/provider-google/lib/provider';

// import { PrivateKey } from "@cdktf/provider-tls/lib/private-key";
// import { TlsProvider } from "@cdktf/provider-tls/lib/provider";
// import { App, TerraformOutput, TerraformStack } from "cdktf";

import { App, TerraformStack } from "cdktf";
import { Construct } from "constructs";
import { awsGoogleVpnparams, awsVpcResourcesparams, awsVpnparams } from "./config/awssettings";
import { googleAwsVpnParams, googleVpcResourcesparams } from "./config/googlesettings";

// import { awsVpcResourcesparams, ec2Configs } from "./config/awssettings";
// import { azureVmsConfigparams, azureVnetResourcesparams } from "./config/azuresettings";
// import { gceInstancesParams, googleVpcResourcesparams } from "./config/googlesettings";
// import { createAwsEc2Instances } from "./resources/vmresources/awsec2";
// import { createAzureVms } from "./resources/vmresources/azurevm";
// import { createGoogleGceInstances } from "./resources/vmresources/googlegce";

import { createAwsVpcResources } from "./resources/vpcnetwork/awsvpc";
import { createGoogleVpcResources } from "./resources/vpcnetwork/googlevpc";
import { createAwsCustomerGateway } from "./resources/vpnnetwork/awscgw";
import { createAwsVpnGateway } from "./resources/vpnnetwork/awsvpngw";

import { createGooglePeerTunnel } from "./resources/vpnnetwork/googletunnels";
import { createGoogleVpnGateway } from "./resources/vpnnetwork/googlevpngw";


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

    // // Azure provider
    // const azurerProvider = new AzurermProvider(this, 'azure', {
    //   features: [{}],
    // });
  
    /* VPC and V-NET */
    // AWS
    const awsVpcResources = createAwsVpcResources(this, awsProvider, awsVpcResourcesparams);
    // Google
    const googleVpcResources = createGoogleVpcResources(this, googleProvider, googleVpcResourcesparams);
    // Azure
    //const azureVnetResources = createAzureVnetResources(this, azurerProvider, azureVnetResourcesparams);

    /* VPN */
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

  // Obtain IP address of VPNGW in Google
  const awsHaVpnGatewayIpAddresses: string[] = [];
  const interfaceCount = 2 ;
  for (let index = 0; index < interfaceCount; index++) {
    const interfaceObj = googleVpnGateways.vpnGateway.vpnInterfaces.get(index);
    if (interfaceObj) {
      awsHaVpnGatewayIpAddresses.push(interfaceObj.ipAddress);
    }
  }
   
  // AWS CustomerGateway (Connect Google)
  const CustomerGatewayParams = {
    customerGatewayName:`${awsVpcResourcesparams.vpcName}-aws-${awsGoogleVpnparams.conneectDestination}-cgw`,
    vpnConnectionName:`${awsVpcResourcesparams.vpcName}-aws-${awsGoogleVpnparams.conneectDestination}-vpn-connection`,
    conneectDestination: awsGoogleVpnparams.conneectDestination,
    awsVpnCgwProps: {
      bgpAsn: googleAwsVpnParams.bgpGoogleAsn,
      type: awsGoogleVpnparams.type
    },
    vpnGatewayId: awsVpnGateway.id,
    awsHaVpnGatewayIpAddresses: awsHaVpnGatewayIpAddresses
  }
  const awsGoogleCgwVpns = createAwsCustomerGateway(this, awsProvider, CustomerGatewayParams)  

  const awsVpnConnections = awsGoogleCgwVpns.flatMap(cgw => {
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

    
    
  // Google VPN tunnels and peers
  const googleVpnParams = {
    vpnTnnelname: `${googleVpcResources.vpc.name}-gcp-aws-vpn-tunnel`,
    routerInterfaceName: `${googleVpcResources.vpc.name}-gcp-aws-router-interface`,
    routerPeerName: `${googleVpcResources.vpc.name}-gcp-aws-router-peer`,
    tunnelCount: awsGoogleCgwVpns.length *2,
    ikeVersion: googleAwsVpnParams.ikeVersion,
    routerName: googleAwsVpnParams.cloudRouterName,
    awsVpnGateway: {
      vpnGatewayId: googleVpnGateways.vpnGateway.id,
      peerAsn:awsVpnparams.bgpAwsAsn,
    },

    awsVpnConnections:awsVpnConnections,
    // awsVpnConnections: awsGoogleCgwVpns.map(cgw => {
    //   const vpnConnection = cgw.vpnConnection;
    //   return [
    //   {
    //       address: vpnConnection.tunnel1Address,
    //       preshared_key: vpnConnection.tunnel1PresharedKey,
    //       cgw_inside_address: vpnConnection.tunnel1CgwInsideAddress,
    //       vgw_inside_address: vpnConnection.tunnel1VgwInsideAddress,
    //     },
    //     {
    //       address: vpnConnection.tunnel2Address,
    //       preshared_key: vpnConnection.tunnel2PresharedKey,
    //       cgw_inside_address: vpnConnection.tunnel2CgwInsideAddress,
    //       vgw_inside_address: vpnConnection.tunnel2VgwInsideAddress,
    //     }
    //   ];
    // }),

    ExternalVpnGateway: {
      name: googleAwsVpnParams.vpnGatewayName,
      interfaces: awsGoogleCgwVpns.flatMap(cgw => [
        { ipAddress: cgw.vpnConnection.tunnel1Address },
        { ipAddress: cgw.vpnConnection.tunnel2Address }
      ]),
    }
  };

  //   ExternalVpnGateway: {
  //     name: googleAwsVpnParams.vpnGatewayName,
  //     interfaces: [
  //       { ipAddress: awsGoogleCgwVpns[0].vpnConnection.tunnel1Address },
  //       { ipAddress: awsGoogleCgwVpns[0].vpnConnection.tunnel2Address },
  //       { ipAddress: awsGoogleCgwVpns[1].vpnConnection.tunnel1Address },
  //       { ipAddress: awsGoogleCgwVpns[1].vpnConnection.tunnel2Address },
  //     ],
  //   } 
  // };
  
  createGooglePeerTunnel(this, googleProvider, googleVpnParams);
    

    
//
  
    
    
    

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
    //     createAzureVms(this, azurerProvider, azureVmParams);

    //   }
    // }

  }
}
const app = new App();
new MultiCloudVpnStack(app, "app");
app.synth();