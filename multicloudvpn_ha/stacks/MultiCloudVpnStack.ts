import { TerraformOutput, TerraformStack } from "cdktf";
import { Construct } from "constructs";
import { createProviders } from "../providers/providers";
import { createVmResources } from "../resources/vmResources";
import { createVpcResources } from "../resources/vpcResources";
import { createVpnResources } from "../resources/vpnResources";
import { createSshKey } from "../utils/sshKey";

export class MultiCloudVpnStack extends TerraformStack {
  constructor(scope: Construct, id: string) {
    super(scope, id);

    // プロバイダーの設定
    const { awsProvider, googleProvider, azureProvider, tlsProvider } = createProviders(this);

    // SSHキーの生成
    const sshKey = createSshKey(this, tlsProvider);

    new TerraformOutput(this, "ssh_private_key_output", {
      value: sshKey.privateKeyPem,
      sensitive: true,
    });

    // VPC/VNet の設定
    const { awsVpcResources, googleVpcResources, azureVnetResources } = createVpcResources(this, awsProvider, googleProvider, azureProvider);

    // VPN の設定
    createVpnResources(this, awsProvider, googleProvider, azureProvider, awsVpcResources, googleVpcResources, azureVnetResources);

    // VM インスタンスの設定
    createVmResources(this, awsProvider, googleProvider, azureProvider, awsVpcResources, googleVpcResources, azureVnetResources, sshKey);
  }
}