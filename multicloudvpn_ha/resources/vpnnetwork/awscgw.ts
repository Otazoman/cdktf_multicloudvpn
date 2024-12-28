import { CustomerGateway } from "@cdktf/provider-aws/lib/customer-gateway";
import { AwsProvider } from "@cdktf/provider-aws/lib/provider";
import { VpnConnection } from "@cdktf/provider-aws/lib/vpn-connection";
import { Construct } from "constructs";


interface CustomerGatewayParams {
  customerGatewayName: string;
  vpnConnectionName: string;
  conneectDestination: string;
  awsVpnCgwProps: {
    bgpAsn: number;
    type: string;
  };
  vpnGatewayId: string;
  awsHaVpnGatewayIpAddresses: string[];
}

export function createAwsCustomerGateway(scope: Construct, provider: AwsProvider, params: CustomerGatewayParams) {
  const awscGwVpncons = params.awsHaVpnGatewayIpAddresses.map((ipAddress, index) => {
    const cgw = new CustomerGateway(scope, `aws_${params.conneectDestination}_cgw_${index}`, {
      provider: provider,
      bgpAsn: params.awsVpnCgwProps.bgpAsn.toString(),
      ipAddress: ipAddress,
      type: params.awsVpnCgwProps.type,
      tags: {
        Name: `${params.customerGatewayName}-${index + 1}`,
      },
    });

    const vpncon = new VpnConnection(scope, `aws_${params.conneectDestination}_vpn_connection_${index}`, {
      provider: provider,
      vpnGatewayId: params.vpnGatewayId,
      customerGatewayId: cgw.id,
      type: params.awsVpnCgwProps.type,
      staticRoutesOnly: false,
      tags: {
        Name: `${params.vpnConnectionName}-${index + 1}`,
      },
    });

    return { customerGateway: cgw, vpnConnection: vpncon }
  });

  return awscGwVpncons;
}