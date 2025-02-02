import { AwsProvider } from '@cdktf/provider-aws/lib/provider';
import { AzurermProvider } from '@cdktf/provider-azurerm/lib/provider';
import { GoogleProvider } from '@cdktf/provider-google/lib/provider';
import { Construct } from 'constructs';
import {
  awsVpcResourcesparams,
  awsVpnparams,
  createCustomerGatewayParams,
} from '../config/awssettings';
import {
  azureAwsVpnparams,
  azureCommonparams,
  azureGoogleVpnparams,
  azureVpnGatewayParams,
  azureVpnparams,
  createLocalGatewayParams,
} from '../config/azuresettings';
import {
  createGoogleVpnPeerParams,
  googleAwsVpnParams,
  googleAzureVpnParams,
  googleVpcResourcesparams,
} from '../config/googlesettings';
import { createAwsCustomerGateway } from '../constructs/vpnnetwork/awscgw';
import { createAwsVpnGateway } from '../constructs/vpnnetwork/awsvpngw';
import { createAzureLocalGateways } from '../constructs/vpnnetwork/azurelocalgwcon';
import { createAzureVpnGateway } from '../constructs/vpnnetwork/azurevpngw';
import { createGooglePeerTunnel } from '../constructs/vpnnetwork/googletunnels';
import { createGoogleVpnGateway } from '../constructs/vpnnetwork/googlevpngw';

export function createVpnResources(
  scope: Construct,
  awsProvider: AwsProvider,
  googleProvider: GoogleProvider,
  azureProvider: AzurermProvider,
  awsVpcResources: any,
  googleVpcResources: any,
  azureVnetResources: any
) {
  const destinationAws = 'aws';
  const destinationAzure = 'azure';
  const destinationGoogle = 'google';
  
  // AWS VPN Gateway
  const awsVpnGatewayResourceparams = {
    vpcId: awsVpcResources.vpc.id,
    routeTableId: awsVpcResources.vpc.defaultRouteTableId,
    amazonSideAsn: awsVpnparams.bgpAwsAsn,
    vgwName: `${awsVpcResourcesparams.vpcName}-vgw`,
  };
  const awsVpnGateway = createAwsVpnGateway(scope, awsProvider, awsVpnGatewayResourceparams);

  // Google VPN Gateway (Connect AWS)
  const GoogleVpnParams = {
    vpcNetwork: googleVpcResources.vpc.name,
    connectDestination: googleAwsVpnParams.connectDestination,
    vpnGatewayName: googleAwsVpnParams.vpnGatewayName,
    cloudRouterName: googleAwsVpnParams.cloudRouterName,
    bgpGoogleAsn: googleAwsVpnParams.bgpGoogleAsn,
  };
  const googleVpnGateways = createGoogleVpnGateway(scope, googleProvider, GoogleVpnParams);

  // Obtain IP address of VPNGW in Google (Connect AWS)
  const awsHaVpnGatewayIpAddresses: string[] = [];
  const awsinterfaceCount = 2;
  for (let index = 0; index < awsinterfaceCount; index++) {
    const interfaceObj = googleVpnGateways.vpnGateway.vpnInterfaces.get(index);
    if (interfaceObj) {
      awsHaVpnGatewayIpAddresses.push(interfaceObj.ipAddress);
    }
  }

  // AWS CustomerGateway (Connect Google)
  const awsGoogleCustomerGatewayParams = createCustomerGatewayParams(
    destinationGoogle,
    googleAwsVpnParams.bgpGoogleAsn,
    awsVpnGateway.id,
    awsHaVpnGatewayIpAddresses
  );
  const awsGoogleCgwVpns = createAwsCustomerGateway(scope, awsProvider, awsGoogleCustomerGatewayParams);

  const awsVpnConnections = awsGoogleCgwVpns.flatMap(cgw => {
    if (!cgw.vpnConnection) return [];
    const vpnConnection = cgw.vpnConnection;
    return [
      {
        address: vpnConnection.tunnel1Address,
        preshared_key: vpnConnection.tunnel1PresharedKey,
        apipaCidr: `${vpnConnection.tunnel1CgwInsideAddress}/30`,
        peerAddress: vpnConnection.tunnel1VgwInsideAddress,
      },
      {
        address: vpnConnection.tunnel2Address,
        preshared_key: vpnConnection.tunnel2PresharedKey,
        apipaCidr: `${vpnConnection.tunnel2CgwInsideAddress}/30`,
        peerAddress: vpnConnection.tunnel2VgwInsideAddress,
      },
    ];
  });

  // Google VPN tunnels and peers (AWS)
  const awsGoogleVpnGateway = {
    vpnGatewayId: googleVpnGateways.vpnGateway.id,
    peerAsn: awsVpnparams.bgpAwsAsn,
  };
  const awsExternalVpnGateway = {
    name: googleAwsVpnParams.vpnGatewayName,
    interfaces: awsGoogleCgwVpns.flatMap(cgw =>
      cgw.vpnConnection ? [
        { ipAddress: cgw.vpnConnection.tunnel1Address },
        { ipAddress: cgw.vpnConnection.tunnel2Address },
      ] : []
    ),
  };
  const awsGoogleVpnParams = createGoogleVpnPeerParams(
    destinationAws,
    awsGoogleCgwVpns.length * 2,
    googleAwsVpnParams.ikeVersion,
    googleAwsVpnParams.cloudRouterName,
    awsGoogleVpnGateway,
    awsExternalVpnGateway,
    awsVpnConnections
  );
  const awsGoogleVpnTunnels = createGooglePeerTunnel(scope, googleProvider, awsGoogleVpnParams);

  // Azure VPN Gateway
  const azureVpnGatewayResourceparams = {
    resourceGroupName: azureCommonparams.resourceGroup,
    virtualNetworkName: azureVnetResources.vnet.name,
    VpnGatewayName: azureVpnGatewayParams.VpnGatewayName,
    gatewaySubnetCidr: azureVpnparams.gatewaySubnetCidr,
    publicIpNames: azureVpnparams.publicIpNames,
    location: azureCommonparams.location,
    vpnProps: {
      type: azureVpnparams.type,
      vpnType: azureVpnparams.vpnType,
      sku: azureVpnparams.sku,
      azureAsn: azureVpnparams.azureAsn,
      pipAlloc: azureVpnparams.pipAlloc,
      awsGwIp1ip1: azureAwsVpnparams.awsGwIp1ip1,
      awsGwIp1ip2: azureAwsVpnparams.awsGwIp1ip2,
      awsGwIp2ip1: azureAwsVpnparams.awsGwIp2ip1,
      awsGwIp2ip2: azureAwsVpnparams.awsGwIp2ip2,
      googleGWip1: azureGoogleVpnparams.googleGwIp1,
      googleGWip2: azureGoogleVpnparams.googleGwIp2,
      googlePeerIp1: azureGoogleVpnparams.googlePeerIp1,
      googlePeerIp2: azureGoogleVpnparams.googlePeerIp2,
    },
    diagnosticSettings: {
      retentionInDays: azureVpnparams.retentionInDays
    },
  }
  const azureVng = createAzureVpnGateway(scope, azureProvider, azureVpnGatewayResourceparams); 

  // AWS CustomerGateway (Connect Azure)
  const azureCgwParams = createCustomerGatewayParams(
    destinationAzure,
    azureVpnparams.azureAsn,
    awsVpnGateway.id,
    azureVng.publicIpData.map(pip => pip.ipAddress)
  );
  const azureCustomerGatewayParams = {
    ...azureCgwParams,
    azureVpnProps: {
      awsGwIpCidr1: azureAwsVpnparams.awsGwIp1Cidr,
      awsGwIpCidr2: azureAwsVpnparams.awsGwIp2Cidr,
    },
  };
  const awsAzureCgwVpns = createAwsCustomerGateway(scope, awsProvider, azureCustomerGatewayParams);

  // Create Azure Local Gateway (AWS)
  const awsAzureVpnTunnels = awsAzureCgwVpns.flatMap((cgw, index) => {
    if (!cgw.vpnConnection) return [];
    const tunnelIndex = index + 1;
    return [
      {
        address: cgw.vpnConnection.tunnel1Address,
        shared_key: cgw.vpnConnection.tunnel1PresharedKey,
        cidrhost: (azureAwsVpnparams as any)[`azureAwsGwIp${tunnelIndex}ip1`],
      },
      {
        address: cgw.vpnConnection.tunnel2Address,
        shared_key: cgw.vpnConnection.tunnel2PresharedKey,
        cidrhost: (azureAwsVpnparams as any)[`azureAwsGwIp${tunnelIndex}ip2`],
      },
    ];
  }).filter(tunnel => tunnel !== null);

  const awsTunnels = awsAzureVpnTunnels.map((tunnel, _index) => ({
    localNetworkGatewayName: `${azureVnetResources.vnet.name}-${destinationAws}-lng`,
    localGatewayAddress: tunnel.address,
    localAddressSpaces: [awsVpcResourcesparams.vpcCidrBlock],
    sharedKey: tunnel.shared_key,
    bgpSettings: {
      asn: awsVpnparams.bgpAwsAsn,
      bgpPeeringAddress: tunnel.cidrhost,
    },
  }));
  const awsAzureLocalGatewayParams = createLocalGatewayParams(
    azureVng.virtualNetworkGateway.id,
    destinationAws,
    awsTunnels
  );
  const awsAzureLocalGateways = createAzureLocalGateways(scope, azureProvider, awsAzureLocalGatewayParams);

  // Google VPN Gateway (Connect Azure)
  const azureVpnConnections = azureVng.publicIpData.flatMap(pip => [
    {
      address: pip.ipAddress,
      ipAddress: azureVpnGatewayParams.vpnProps.googlePeerIp1,
      preshared_key: azureGoogleVpnparams.presharedKey,
      peerAddress: azureVpnGatewayParams.vpnProps.googleGWip1,
    },
    {
      address: pip.ipAddress,
      ipAddress: azureVpnGatewayParams.vpnProps.googlePeerIp2,
      preshared_key: azureGoogleVpnparams.presharedKey,
      peerAddress: azureVpnGatewayParams.vpnProps.googleGWip2,
    },
  ]);

  const GoogleAzureVpnParams = {
    vpcNetwork: googleVpcResources.vpc.name,
    connectDestination: googleAzureVpnParams.connectDestination,
    vpnGatewayName: googleAzureVpnParams.vpnGatewayName,
    cloudRouterName: googleAzureVpnParams.cloudRouterName,
    bgpGoogleAsn: googleAzureVpnParams.bgpGoogleAsn,
  };
  const googleAzureVpnGateways = createGoogleVpnGateway(scope, googleProvider, GoogleAzureVpnParams);

  // Obtain IP address of VPNGW in Google (Azure)
  const azureHaVpnGatewayIpAddresses: string[] = [];
  const azureinterfaceCount = 2;
  for (let index = 0; index < azureinterfaceCount; index++) {
    const interfaceObj = googleAzureVpnGateways.vpnGateway.vpnInterfaces.get(index);
    if (interfaceObj) {
      azureHaVpnGatewayIpAddresses.push(interfaceObj.ipAddress);
    }
  }

  // Google VPN tunnels and peers (Azure)
  const azureTunnelcount = 2;
  const azureGoogleVpnGateway = {
    vpnGatewayId: googleAzureVpnGateways.vpnGateway.id,
    peerAsn: azureVpnparams.azureAsn,
  };
  const azureExternalVpnGateway = {
    name: googleAzureVpnParams.vpnGatewayName,
    interfaces: azureVng.publicIpData.map(pip => ({ ipAddress: pip.ipAddress })),
  };
  const azureGoogleVpnParams = createGoogleVpnPeerParams(
    destinationAzure,
    azureTunnelcount,
    googleAzureVpnParams.ikeVersion,
    googleAzureVpnParams.cloudRouterName,
    azureGoogleVpnGateway,
    azureExternalVpnGateway,
    azureVpnConnections
  );
  const azureGoogleVpnTunnels = createGooglePeerTunnel(scope, googleProvider, azureGoogleVpnParams);

  // Azure localGateway and tunnels (Connect Google)
  const googleAzureVpnTunnels = [];
  const vpninterfacesCount = 2;

  for (let index = 0; index < vpninterfacesCount; index++) {
    const interfaceObj = googleAzureVpnGateways.vpnGateway.vpnInterfaces.get(index);
    if (interfaceObj && interfaceObj.ipAddress) {
      googleAzureVpnTunnels.push({
        address: interfaceObj.ipAddress,
        shared_key: azureGoogleVpnparams.presharedKey,
        cidrhost: index === 0 ? azureGoogleVpnparams.googlePeerIp1 : azureGoogleVpnparams.googlePeerIp2,
      });
    }
  }

  // Create Azure Local Gateway (Google)
  const googleTunnels = googleAzureVpnTunnels.map((tunnel, _index) => ({
    localNetworkGatewayName: `${azureVnetResources.vnet.name}-${destinationGoogle}-lng`,
    localGatewayAddress: tunnel.address,
    localAddressSpaces: [googleVpcResourcesparams.vpcCidrblock],
    sharedKey: tunnel.shared_key,
    bgpSettings: {
      asn: googleAzureVpnParams.bgpGoogleAsn,
      bgpPeeringAddress: tunnel.cidrhost,
    },
  }));
  const googleAzureLocalGatewayParams = createLocalGatewayParams(
    azureVng.virtualNetworkGateway.id,
    destinationGoogle,
    googleTunnels
  );
  const googleAzureLocalGateways = createAzureLocalGateways(scope, azureProvider, googleAzureLocalGatewayParams);

  return {
    awsVpnGateway,
    googleVpnGateways,
    awsGoogleCgwVpns,
    awsGoogleVpnTunnels,
    azureVng,
    awsAzureCgwVpns,
    awsAzureLocalGateways,
    googleAzureVpnGateways,
    azureGoogleVpnTunnels,
    googleAzureLocalGateways,
  };
}