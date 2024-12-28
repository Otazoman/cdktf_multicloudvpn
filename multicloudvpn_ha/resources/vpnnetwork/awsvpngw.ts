// awsvpngw.ts
import { AwsProvider } from "@cdktf/provider-aws/lib/provider";
import { VpnGateway } from "@cdktf/provider-aws/lib/vpn-gateway";
import { VpnGatewayRoutePropagation } from "@cdktf/provider-aws/lib/vpn-gateway-route-propagation";
import { Construct } from "constructs";

interface VpnGatewayParams {
  vpcId: string;
  routeTableId: string;
  vgwName: string;
  amazonSideAsn: number;
}

export function createAwsVpnGateway(scope: Construct, provider: AwsProvider, params: VpnGatewayParams) {
  // 仮想プライベートゲートウェイの作成
    const vpnGateway = new VpnGateway(scope, "cmk_vgw", {
        provider: provider, 
        vpcId: params.vpcId,
        amazonSideAsn: params.amazonSideAsn as unknown as string,
        tags: {
          Name: params.vgwName,
        },
  });

  // 仮想プライベートゲートウェイのルート伝播の設定
  new VpnGatewayRoutePropagation(scope, "cmk_vge_rp", {
    provider: provider, 
    vpnGatewayId: vpnGateway.id,
    routeTableId: params.routeTableId,
  });

  return vpnGateway;
}
