### README.md

# Group-20

## Team Members
| Serial No.|Name | Unity ID |
| :---: | :---: | :---: |
|1. | Mangalnathan Vijayagopal |  mvijaya2|
|2. | Niranjan Pandeshwar     |   nrpandes|
|3. | Sharath Bangalore Ramesh Kumar | sbangal2|

Access Project Board [here](https://github.ncsu.edu/cscdevops-spring2021/DEVOPS-20/projects): 

## Test Milestone

* Automatically configure a build environment and build job for a Java application (iTrust)
* Implement a test suite analysis for detecting useful tests.
* Implement a static analysis for detecting code smells.

### Instructions to Setup and Run

1. Please follow Build Milestone steps to:
  - Automatically configure a build server with jenkins and ansible. 
  - Automatically configure a build environment for a node web applications (checkbox.io)
  - Create a build Job

Note: As an enhancement to Milestone 2 the pipeline setup command has been updated as below.
```
pipeline setup --gh-user $GIT_USER --gh-pass $GIT_PASS
```
Before running above setup command, the $GIT_USER and $GIT_PASS must be configured in the environment system variables in the local machine.

2. Automatically configure a build environment and build job for Java Application (iTrust)
```
pipeline build iTrust -u <admin> -p <admin>
```

3. Implement a test suite analysis for detecting useful tests.

4. Implement a static analysis for detecting code smells.


### Challenges Faced and Major Learning Outcomes

####  Configuring the Build environment and build job for a java application.
  * Major Learning Outcomes and Challenges Faced:
    - As part of this milestone to checkout the Itrust directory we have to pass the GitHub Credentials by maintaining the confidentiality. 
    - This milestone gave us exposure to project management tool MAVEN. It is build automation tool which is mainly used for java projects.
    - We also learnt regarding configuraing of MySQL on the ubuntu machines using ansible scripts. Also MySQL also depends on other packages like python3-pymysql, python3-pip etc.
    - Maven project management tool requires google chrome extension
      
      
  * Challenges Faced: 
    - To accomplish accessing github credentials username and password are stored in the local system environment, and these are passed to the code via pipeline setup command as arguments.
    - Changing the password of the MySQL proved to be little challenging. For changing the password we made use of debconf



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
```

<br />

If `npm link` does not work, then use `npm link --force` instead.

Create a `.vault-pass` file containing the password in the same level as `package.json` before proceeding.

Run the command below to create a new VM and setup build environment in the new VM.

```
pipeline setup
```

After `pipeline setup`, Run the command below to trigger a build job named checkbox.io and print the build log.

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
  - To overcome the autentication problem, and have a default login credentials admin/admin to login to the jenkin job builders.
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

Click [here](https://drive.google.com/file/d/1sROAvnjN9UaSy27gTr2zWh3PeqXhAbX6/view?usp=sharing) to watch screencast of the project.

### Checkpoint Report

View details about Checkpoint 1 [here](https://github.ncsu.edu/cscdevops-spring2021/DEVOPS-20/blob/nrpandes/CHECKPOINT.md)

### Note

* Due to host machine specifications, `pipeline setup` might not run successfully. For example, some jenkins plugins might not be installed because of connection timeout. Please ensure that you have a good internet connection and it is recommended to close any other applications that might use up internet speed.

* During screencast, while accessing jenkins dashboard, the browser shows page not found error because we were trying to access the dashboard while jenkins server was restarting.
