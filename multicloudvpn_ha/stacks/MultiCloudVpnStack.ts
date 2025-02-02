import { TerraformOutput, TerraformStack } from 'cdktf';
import { Construct } from 'constructs';
import { createProviders } from '../providers/providers';
import { createVmResources } from '../resources/vmResources';
import { createVpcResources } from '../resources/vpcResources';
import { createVpnResources } from '../resources/vpnResources';
import { createSshKey } from '../utils/sshKey';

export class MultiCloudVpnStack extends TerraformStack {
  constructor(scope: Construct, id: string) {
    super(scope, id);

    // providers
    const { awsProvider, googleProvider, azureProvider, tlsProvider } = createProviders(this);

    // create ssh key
    const sshKey = createSshKey(this, tlsProvider);

    new TerraformOutput(this, 'ssh_private_key_output', {
      value: sshKey.privateKeyPem,
      sensitive: true,
    });

    // vpc/vnet
    const { awsVpcResources, googleVpcResources, azureVnetResources } = createVpcResources(this, awsProvider, googleProvider, azureProvider);

    // VPN
    const vpnResources = createVpnResources(this, awsProvider, googleProvider, azureProvider, awsVpcResources, googleVpcResources, azureVnetResources);

    // VM
    createVmResources(this, awsProvider, googleProvider, azureProvider, awsVpcResources, googleVpcResources, azureVnetResources, sshKey, vpnResources);
  }
}