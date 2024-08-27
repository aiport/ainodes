const express = require('express');
const Docker = require('dockerode');
const chalk = require('chalk');
const fs = require('fs');
const path = require('path');
const router = express.Router();
const config = require('../../config.json');
const os = require('os');
const db = require('../../runners/db');
const axios = require('axios');
const e = require('express');
process.env.dockerSocket = process.platform === "win32" ? "//./pipe/docker_engine" : "/var/run/docker.sock";
const docker = new Docker({ socketPath: process.env.dockerSocket });
docker.ping().then(() => {
    console.log(chalk.bold.green('Docker is running on your machine!'));
}).catch((err) => {
    console.log(chalk.bold.red('Docker is not running on your machine!'));
});

router.post('/create', async (req, res) => {
    console.log(chalk.bold.green('A new container creation request has been received! \n Checking if request is authorized...'));
    if(!req.headers.authorization) return res.status(401).json({ error: 'Unauthorized' });
    if(req.headers.authorization !== `Bearer ${config.secret_key}`) return res.status(401).json({ error: 'Wrong Key' });
    const Image = req.headers.image;
    const ports = req.headers.ports;
    const Cmd = req.headers.cmd;
    const Env = req.headers.env;
    const Memory = req.headers.memory;
    const Cpu = req.headers.cpu;
    try{
        console.log(chalk.bold.green('Request is authorized! \n Creating container...'));
        await docker.pull(Image, (err, stream) => {
            if (err) {
                console.error(chalk.bold.red(`Error pulling image ${Image}: ${err}`));
                return;
            }
            docker.modem.followProgress(stream, onFinished, onProgress);
            async function onFinished(err, output) {
                if (err) {
                    console.error(chalk.bold.red(`Error pulling image ${Image}: ${err}`));
                } else {
                    console.log(chalk.bold.green(`Image ${Image} installed successfully!`));
                            let id = new Date().getTime().toString();
        const paths = path.join(__dirname, '../../server', id); // Using timestamp for unique dir
        fs.mkdirSync(paths, { recursive: true });
        let ExposedPorts = {};
        let PortBindings = {};
        console.log(chalk.bold.green('Creating container...'));
        if(ports){
            ports.split(',').forEach(portMapping => {
                const [containerPort, hostPort] = portMapping.split(':');
                const key = `${containerPort}/tcp`;
                ExposedPorts[key] = {};
                PortBindings[key] = [{ HostPort: hostPort }];
              });
        }
        const containerOptions = {
            Image,
            ExposedPorts:ExposedPorts,
            AttachStdout: true,
            AttachStderr: true,
            AttachStdin: true,
            Tty: true,
            OpenStdin: true,
            HostConfig: {
                PortBindings:PortBindings,
                Binds: [`${paths}:/serverdata`],
                Memory: Memory * 1024 * 1024,
                CpuCount: parseInt(Cpu)
            }
        };

        if (Cmd) containerOptions.Cmd = Cmd;
        if (Env) containerOptions.Env = Env;
        const container = await docker.createContainer(containerOptions);
        console.log(chalk.bold.green('Container created successfully! \n Starting container...'));
        await container.start();
        console.log(chalk.bold.green('Container started successfully!'));
        const data={
            containerId: container.id,
            message: 'Container created successfully',
            image: Image,
            ports: ports,
            cmd: Cmd | undefined,
            env: Env | undefined,
            memory: Memory,
            cpu: Cpu,
            containerOptions: containerOptions
        }
        //options for the container
        
        res.status(200).json({containerId: container.id, message: 'Container created successfully', fileId: id});
        try{
            const opt = {
              method: 'post',
              url: `${config.server_url}/server/create/${id}`,
              headers: {
                'Authorization': 'Bearer authcode$1',
                'usertoken':'qRX8qBEoph5vDISDkej2BewihTpijNEj4AOu96ZLzh2RR64jnPr6QTYrFdSx98zX53H3ZdJYx4qWlQrZQDVJPgCbbQ5uL6wIlz3mpuVZyfybBQtL8prq6c3H1IooME8zDtPsf1WsQE1U4tvi12udv9pF8LtKnBTKFoiSyJtSd1X75GvlYTPJTpN34j6MZ8LqWWCQ3h8hyQkSFvvqrHVj0O93ATkSqHhuxtvohxM0sh0lIUhcBkgJtXBSWJV8xQ1n',
                image: 'ubuntu',
                name: 'ayyoo',
                memory: 1024,
                cpu: 1,
                ports: ports,
                id: id,
                'nodeUrl':'http://localhost:3000',
              }
              
            }
            const resp = await axios(opt)
            console.log(resp.data)
          }catch(er){
            console.log('Makeing store failed')
            console.log(er)
          }
                }
            }
            function onProgress(event) {
                let progress = event.progress || "";
                if(progress == ""){
                console.log(event.status);
                }else{
                    
                console.log(event.status + ": " + progress);
                }
            }
        });
        }catch(err){
            console.log(err)
            console.log(chalk.bold.red(`Error creating container: ${err}`));
            res.status(500).json({error: err});
        }
});

router.delete('/delete/:id', async (req, res) => {
    const id = req.params.id;
    const headers = req.headers;
    console.log(chalk.bold.green(`A request to delete container ${id} has been received! \n Checking if request is authorized...`));
    if(!headers.authorization) return res.status(401).json({ error: 'Unauthorized' });
    if(headers.authorization !== `Bearer ${config.secret_key}`) return res.status(401).json({ error: 'Unauthorized' });
    try{
        console.log(chalk.bold.green('Request is authorized! \n Deleting container...'));
        console.log(chalk.bold.green(`Deleting container ${id}...`));
        const container = docker.getContainer(id);
        console.log(chalk.bold.green(`Stopping container ${id}...`));
        try{
            await container.stop();
            console.log(chalk.bold.green(`Container ${id} stopped successfully!`));
        }catch{
            console.log(chalk.bold.red(`Error stopping container ${id}`));
        }
        await container.remove();
        console.log(chalk.bold.green(`Container ${id} deleted successfully!`));
        db.db.get('containers').remove({containerId: id});
        res.status(200).json({message: `Container ${id} deleted successfully!`});
    }catch(err){
        console.log(chalk.bold.red(`Error deleting container: ${err}`));
        res.status(500).json({error: err});
    }
});

module.exports = router;

