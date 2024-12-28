const resourceGroup = 'rg_multicloud';
const location = 'Japan East';

/* V-NET */
export const azureVnetResourcesparams = {
    resourceGroupName: resourceGroup,
    location: location,
    vnetName: 'my-azure-vnet',
    vnetAddressSpace: '10.1.0.0/16',
    subnets: [
      { name: 'subnet1', cidr: '10.1.1.0/24' },
      { name: 'subnet2', cidr: '10.1.2.0/24' },
    ],
    nsgRules: [
      {
        name: 'AllowVnetInBound',
        priority: 100,
        direction: 'Inbound',
        access: 'Allow',
        protocol: '*',
        sourcePortRange: '*',
        destinationPortRange: '*',
        sourceAddressPrefix: 'VirtualNetwork',
        destinationAddressPrefix: 'VirtualNetwork',
      },
      {
        name: 'AllowAzureLoadBalancerInBound',
        priority: 101,
        direction: 'Inbound',
        access: 'Allow',
        protocol: '*',
        sourcePortRange: '*',
        destinationPortRange: '*',
        sourceAddressPrefix: 'AzureLoadBalancer',
        destinationAddressPrefix: '*',
      },
      {
        name: 'DenyAllInBound',
        priority: 4096,
        direction: 'Inbound',
        access: 'Deny',
        protocol: '*',
        sourcePortRange: '*',
        destinationPortRange: '*',
        sourceAddressPrefix: '*',
        destinationAddressPrefix: '*',
      },
      {
        name: 'AllowVnetOutBound',
        priority: 100,
        direction: 'Outbound',
        access: 'Allow',
        protocol: '*',
        sourcePortRange: '*',
        destinationPortRange: '*',
        sourceAddressPrefix: 'VirtualNetwork',
        destinationAddressPrefix: 'VirtualNetwork',
      },
      {
        name: 'AllowAllOutBound',
        priority: 4095,
        direction: 'Outbound',
        access: 'Allow',
        protocol: '*',
        sourcePortRange: '*',
        destinationPortRange: '*',
        sourceAddressPrefix: '*',
        destinationAddressPrefix: '*',
      },
      {
        name: 'DenyAllOutBound',
        priority: 4096,
        direction: 'Outbound',
        access: 'Deny',
        protocol: '*',
        sourcePortRange: '*',
        destinationPortRange: '*',
        sourceAddressPrefix: '*',
        destinationAddressPrefix: '*',
      },
    ],
}

/* AzureVM */
export const azureVmsConfigparams = [
    {
      name: 'example-vm-1',
      resourceGroupName: resourceGroup,
      location: location,
      size: 'Standard_B1ls',
      adminUsername: 'azureuser',
      osDisk: {
        caching: 'ReadWrite',
        storageAccountType: 'Standard_LRS',
      },
      sourceImageReference: {
        publisher: 'Canonical',
        offer: 'ubuntu-24_04-lts',
        sku: 'server',
        version: 'latest',
      },
    },
    // {
    //   name: 'example-vm-2',
    //   resourceGroupName: 'rg_multicloud',
    //   location: 'Japan East',
    //   size: 'Standard_B1ls',
    //   adminUsername: 'azureuser',
    //   osDisk: {
    //     caching: 'ReadWrite',
    //     storageAccountType: 'Standard_LRS',
    //   },
    //   sourceImageReference: {
    //     publisher: 'Canonical',
    //     offer: 'ubuntu-24_04-lts',
    //     sku: 'server',
    //     version: 'latest',
    //   },
    // },
]