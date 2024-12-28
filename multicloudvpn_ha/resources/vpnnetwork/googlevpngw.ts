import { ComputeHaVpnGateway } from "@cdktf/provider-google/lib/compute-ha-vpn-gateway";
import { ComputeRouter } from "@cdktf/provider-google/lib/compute-router";
import { GoogleProvider } from "@cdktf/provider-google/lib/provider";
import { Construct } from "constructs";

interface GoogleVpnParams {
  vpcNetwork: string;
  connectDestination: string;
  vpnGatewayName: string;
  cloudRouterName: string;
  bgpGoogleAsn: number;
}

export function createGoogleVpnGateway(scope: Construct, provider: GoogleProvider, params: GoogleVpnParams) {
  //環境変数がdevelopの場合はシングル構成にできるようにする

  // VPN Gateway
  const vpnGateway = new ComputeHaVpnGateway(scope, `${params.connectDestination}_gcp_ha_vpn`, {
    provider: provider,
    name: params.vpnGatewayName,
    network: params.vpcNetwork,
  });

  // Cloud Router
  const cloudRouter = new ComputeRouter(scope, `${params.connectDestination}_gcp_router`, {
    provider: provider,
    name: params.cloudRouterName,
    network: params.vpcNetwork,
    bgp: {
      asn: params.bgpGoogleAsn,
    },
  });

  return { vpnGateway, cloudRouter };
}