### README.md

# Group-20

## Team Members
| Serial No.|Name | Unity ID |
| :---: | :---: | :---: |
|1. | Mangalnathan Vijayagopal |  mvijaya2|
|2. | Niranjan Pandeshwar     |   nrpandes|
|3. | Sharath Bangalore Ramesh Kumar | sbangal2|

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

* Major Learning Outcomes:
  - Good hands on learning experience on scripting ansible play book.
  - Jinja Templating interaction with ansible.
  - Ansible-vault - an efficient way to encrypt secret keys / variable files.
  - Installation of Jenkins from scratch on a ubuntu machine.
  - Bypassing registration and setup wizard of jenkins using init.groovy file.
  - Installation of Jenkins packages/plugins.

* Challenges Faced:
  - Turning off the jenkins setup wizard using the groovy script placed in the jenkins ini directory.
  ```
  instance.setInstallState(InstallState.INITIAL_SETUP_COMPLETED)
  ```
  - To overcome the attentication problem, and have a default login credentials admin/admin to login to the jenkin job builders.
  - To know what dependent packages should be installed to build a job in jenkins.
  - Using build-pipeline-plugin ansible module, did not help in installing all the required packages, as we frequently faced time out issues. To overcome this we had to manually install suggested plugin by logging into the jenkins GUI and did reverse engineer to figure out what packages were installing using the following command in jenkins cli.
  ```nodejs
  Jenkins.instance.pluginManager.plugins.each{
  plugin -> 
    println ("${plugin.getDisplayName()} (${plugin.getShortName()}): ${plugin.getVersion()}")
  }
  ```
  
  - For  building the job in jenkins we needs addition plugins like jenkins job builder, jmespath and download jenkins CLI which was used in build pipeline.
  
#### Build Environment for Checkbox.io

* Major Learning Outcomes:

  - Learnt how to install and setup mongodb through ansible.
  - Learnt how to a create and configure a mongoDB user account with readwrite role.
  - We also learnt how to use `lineinfile` to set up environment variables in a file

* Challenges Faced:

  - Achieving authentication without storing password was challenging. We made use of ansible vaults to encrypt the DB password and pass it for authentication.
  - The environment variables required to set up checkbox.io were stored in '/etc/environment' file. Although this file had all the variables needed by checkbox.io, the build job was not making use of the environment file. Since the shell could read the environment file, we ran export commands in the build job script to set the required environment variables.

#### Create Build Job

* Major Learning Outcomes:

  - We learnt a lot about triggering a jenkins build through `jenkins-job-builder` without any manual intervention like creating Jenkins projects, configuring build step and post build actions.
  - We also learnt how to define a job (In YAML) using a pipeline style. We perceived a better understanding of the pipeline build stage and feel confident about developing foundation knowledge about the build stage. 


* Challenges Faced:

  - One major challenge faced was in setting up environment variables so it reflects in Jenkins shell. We were facing a lot of connection and authentication issues until the Professor posted about using Jenkins authentication tokens in Discord. 
  - Lack of comprehensive resources  in the Internet about using Jenkins effectively. 



### Distribution of Tasks

* Configure a build server with jenkins and ansible - Sharath Bangalore Ramesh Kumar

* Configure a build environment for Checkbox.io - Niranjan Pandeshwar

* Create a build job - Mangalnathan Vijayagopal

* Documentation and Screencast - Mangalnathan Vijayagopal, Niranjan Pandeshwar, Sharath Bangalore Ramesh Kumar


### Screencast

Click here to watch screencast of the project.

### Checkpoint Report

View details about Checkpoint 1 [here](https://github.ncsu.edu/cscdevops-spring2021/DEVOPS-20/blob/nrpandes/CHECKPOINT.md)

