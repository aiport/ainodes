const axios = require('axios')
const ports = "8080:3000,9000:5900";
let response; 
(async () =>{
let header = {
    'Content-Type': 'application/json',
    'Authorization':'Bearer default_key',
    'image':'ubuntu',
    'name':"ayyoo",
    'memory':1024,
    'cpu':1,
    'ports': '8080:8080,2000:2000'
}
const RequestData = {
    method: 'post',
    url: `http://localhost:3000/server/create`,
    headers: header
  };
  try {
    const res = await axios(RequestData);
    console.log(res.data) 

  }catch(er){
    console.log('Error creating container')
    console.log(er)
  }
 
  console.log(response)
})()