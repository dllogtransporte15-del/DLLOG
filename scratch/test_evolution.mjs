async function test() {
  const url = 'http://localhost:8080';
  const apiKey = 'c1f7333c96962458559ec3b861d0046b4a479d23a51e897c6f4d9129475509bc';
  const instanceName = 'transcunha_matriz';

  console.log('1. Testing health...');
  const healthRes = await fetch(`${url}/`, { headers: { apikey: apiKey } });
  console.log('Health status:', healthRes.status, await healthRes.json());

  console.log('\n2. Testing instance creation...');
  const createRes = await fetch(`${url}/instance/create`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': apiKey
    },
    body: JSON.stringify({
      instanceName: instanceName,
      qrcode: true,
      integration: 'WHATSAPP-BAILEYS'
    })
  });
  console.log('Create status:', createRes.status);
  const createData = await createRes.json();
  console.log('Create data:', JSON.stringify(createData).substring(0, 300));

  console.log('\n3. Testing connect...');
  const connectRes = await fetch(`${url}/instance/connect/${instanceName}`, {
    headers: { apikey: apiKey }
  });
  console.log('Connect status:', connectRes.status);
  const connectData = await connectRes.json();
  console.log('Connect data:', JSON.stringify(connectData));

  console.log('\n4. Testing connectionState...');
  const stateRes = await fetch(`${url}/instance/connectionState/${instanceName}`, {
    headers: { apikey: apiKey }
  });
  console.log('State status:', stateRes.status);
  console.log('State data:', JSON.stringify(await stateRes.json(), null, 2));

  console.log('\n5. Testing fetchInstances...');
  const instancesRes = await fetch(`${url}/instance/fetchInstances`, {
    headers: { apikey: apiKey }
  });
  console.log('Instances status:', instancesRes.status);
  console.log('Instances data:', JSON.stringify(await instancesRes.json(), null, 2));
}

test().catch(console.error);
