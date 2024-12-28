import { DataAzurermPublicIp } from "@cdktf/provider-azurerm/lib/data-azurerm-public-ip";
import { AzurermProvider } from "@cdktf/provider-azurerm/lib/provider";
import { PublicIp } from "@cdktf/provider-azurerm/lib/public-ip";
import { Subnet } from "@cdktf/provider-azurerm/lib/subnet";
import { VirtualNetworkGateway } from "@cdktf/provider-azurerm/lib/virtual-network-gateway";
import { Construct } from "constructs";

interface VpnGatewayParams {
  resourceGroupName: string;
  virtualNetworkName: string;
  gatewaySubnetCidr: string;
  publicIpNames: string[];
  location: string;
  vpnProps: {
    type: string;
    vpnType: string;
    sku: string;
    azureAsn: number;
    pipAlloc: string;
    awsGwIp1Cidr1: string;
    awsGwIp1Cidr2: string;
    awsGwIp2Cidr1: string;
    awsGwIp2Cidr2: string;
  };
}

export function createAzureVpnGateway(scope: Construct, provider: AzurermProvider, params: VpnGatewayParams) {
  // Gateway Subnet作成
  const gatewaySubnet = new Subnet(scope, "azure_gatewaySubnet", {
    provider: provider, 
    resourceGroupName: params.resourceGroupName,
    virtualNetworkName: params.virtualNetworkName,
    name: "GatewaySubnet",
    addressPrefixes: [params.gatewaySubnetCidr],
  });

  // Public IPの作成
  const publicIps = params.publicIpNames.map(name => new PublicIp(scope, `azure_gw_public_ips_${name}`, {
    provider: provider, 
    name,
    resourceGroupName: params.resourceGroupName,
    location: params.location,
    allocationMethod: "Static", // または "Dynamic"
  }));

  // 仮想ネットワークゲートウェイの作成
  const vng = new VirtualNetworkGateway(scope, "azure_vng", {
    provider: provider, 
    name: `${params.virtualNetworkName}-vng`,
    resourceGroupName: params.resourceGroupName,
    location: params.location,
    type: params.vpnProps.type,
    vpnType: params.vpnProps.vpnType,
    enableBgp: true,
    activeActive: true,
    sku: params.vpnProps.sku,
    bgpSettings: {
      asn: params.vpnProps.azureAsn,
      peeringAddresses: [
        {
          ipConfigurationName: "vnetGatewayConfig-1",
          apipaAddresses: [
            params.vpnProps.awsGwIp1Cidr1,
            params.vpnProps.awsGwIp1Cidr2,
          ],
        },
        {
          ipConfigurationName: "vnetGatewayConfig-2",
          apipaAddresses: [
            params.vpnProps.awsGwIp2Cidr1,
            params.vpnProps.awsGwIp2Cidr2,
          ],
        },
      ],
    },
    ipConfiguration: [
      {
        name: "vnetGatewayConfig-1",
        publicIpAddressId: publicIps[0].id,
        privateIpAddressAllocation: params.vpnProps.pipAlloc,
        subnetId: gatewaySubnet.id,
      },
      {
        name: "vnetGatewayConfig-2",
        publicIpAddressId: publicIps[1].id,
        privateIpAddressAllocation: params.vpnProps.pipAlloc,
        subnetId: gatewaySubnet.id,
      },
    ],
  });

  // Public IPのデータ取得
  const publicIpData = params.publicIpNames.map(name => new DataAzurermPublicIp(scope, `pip_vgw_${name}`, {
    name,
    resourceGroupName: params.resourceGroupName,
    dependsOn: [vng],
  }));
  return publicIpData
}