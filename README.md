### README.md

# Group-20

## Team Members
| Serial No.|Name | Unity ID |
| :---: | :---: | :---: |
|1. | Mangalnathan Vijayagopal |  mvijaya2|
|2. | Niranjan Pandeshwar     |   nrpandes|
|3. | Sharath BR | sbangal2|

## Build Milestone

### General Tasks

* Automatically configure a build server with jenkins and ansible.
* Automatically configure a build environment for a node web application (checkbox.io).
* Create a build job.

### Design Architecture

![image](https://media.github.ncsu.edu/user/16849/files/bab87700-8912-11eb-945c-661ecfef103a)


### Instructions to Setup and Run

Clone this project by running 

```
git clone https://github.ncsu.edu/cscdevops-spring2021/DEVOPS-20.git
```

Inside DEVOPS-20, run the following commands to spawn build server and run ansible scripts to install dependencies

```
npm install
npm link
pipeline setup
```

Trigger a build job named checkbox.io and print build log.

```
pipeline build checkbox.io -u admin -p admin
```

### Challenges Faced and Major Learning Outcomes

#### Build Server with Jenkins and Ansible

* 

#### Build Environment for Checkbox.io

* Achieving authentication without storing password was challenging. We made use of ansible vaults to encrypt the DB password and pass it for authentication.

* The environment variables required to set up checkbox.io were stored in '/etc/environment' file. Although this file had all the variables needed by checkbox.io, the build job was not making use of the environment file. Since the shell could read the environment file, we ran export commands in the build job script to set the required environment variables.

#### Create Build Job

* 

### Distribution of Tasks

* Configure a build server with jenkins and ansible - Sharath

* Configure a build environment for Checkbox.io - Niranjan

* Create a build job - Mangalnathan

* Documentation and Screencast - Mangalnathan, Niranjan, Sharath


### Screencast

Click here to watch screencast of the project.

### Checkpoint Report

View details about Checkpoint 1 [here](https://github.ncsu.edu/cscdevops-spring2021/DEVOPS-20/blob/nrpandes/CHECKPOINT.md)

