import { ComputeExternalVpnGateway } from "@cdktf/provider-google/lib/compute-external-vpn-gateway";
import { ComputeRouterInterface } from "@cdktf/provider-google/lib/compute-router-interface";
import { ComputeRouterPeer } from "@cdktf/provider-google/lib/compute-router-peer";
import { ComputeVpnTunnel } from "@cdktf/provider-google/lib/compute-vpn-tunnel";
import { GoogleProvider } from "@cdktf/provider-google/lib/provider";
import { Construct } from "constructs";

interface ExternalVpnGatewayParams {
  name: string;
  interfaces: { ipAddress: string }[];
}

interface TunnelConfig {
  preshared_key: string;
  apipaCidr?: string;
  peerAddress: string;
  ipAddress?: string;
}

interface GoogleVpnParams {
  vpnTnnelname: string;
  routerInterfaceName: string;
  routerPeerName: string;
  tunnelCount: number;
  ikeVersion: number;
  routerName: string;
  vpnGateway: {
    vpnGatewayId: string;
    peerAsn: number;
  };
  vpnConnections: TunnelConfig[];
  externalVpnGateway: ExternalVpnGatewayParams;
  connectDestination: string;
}

export function createGooglePeerTunnel(
  scope: Construct,
  provider: GoogleProvider,
  params: GoogleVpnParams
) {
  const isAws = params.connectDestination.toLowerCase() === "aws";
  const tunnelCount = isAws ? 4 : 2;

  // External Gateway
  const externalVpnGateway = new ComputeExternalVpnGateway(
    scope,
    params.externalVpnGateway.name,
    {
      provider: provider,
      name: params.externalVpnGateway.name,
      redundancyType: isAws ? "FOUR_IPS_REDUNDANCY" : "TWO_IPS_REDUNDANCY",
      interface: params.externalVpnGateway.interfaces
        .slice(0, tunnelCount)
        .map((iface, index) => ({
          id: index,
          ipAddress: iface.ipAddress,
        })),
    }
  );

  // Vpn Tunnel
  const vpnTunnels = params.vpnConnections.slice(0, tunnelCount).map(
    (tunnel, index) =>
      new ComputeVpnTunnel(
        scope,
        `VpnTunnel${params.connectDestination}-${index + 1}`,
        {
          provider,
          name: `${params.vpnTnnelname}-${index + 1}`,
          vpnGateway: params.vpnGateway.vpnGatewayId,
          vpnGatewayInterface: isAws ? Math.floor(index / 2) : index,
          peerExternalGateway: externalVpnGateway.id,
          peerExternalGatewayInterface: isAws ? index : index % 2,
          sharedSecret: tunnel.preshared_key,
          router: params.routerName,
          ikeVersion: params.ikeVersion,
        }
      )
  );

  // Router Interfaces
  const routerInterfaces = vpnTunnels.map((tunnel, index) => {
    return new ComputeRouterInterface(
      scope,
      `RouterInterface${params.connectDestination}-${index + 1}`,
      {
        provider,
        name: `${params.routerInterfaceName}-${index + 1}`,
        router: params.routerName,
        ...(isAws ? { ipRange: params.vpnConnections[index].apipaCidr } : {}),
        vpnTunnel: tunnel.name,
      }
    );
  });

  // Router Peers
  const routerPeers = routerInterfaces.map((routerInterface, index) => {
    const connection = params.vpnConnections[index];
    return new ComputeRouterPeer(
      scope,
      `RouterPeer${params.connectDestination}-${index + 1}`,
      {
        provider,
        name: `${params.routerPeerName}-${index + 1}`,
        router: params.routerName,
        peerIpAddress: connection.peerAddress,
        peerAsn: params.vpnGateway.peerAsn,
        interface: routerInterface.name,
        advertisedRoutePriority: 100,
        ...(connection.ipAddress !== undefined && {
          ipAddress: connection.ipAddress,
        }),
      }
    );
  });

  return {
    externalVpnGateway,
    vpnTunnels,
    routerInterfaces,
    routerPeers,
  };
}
