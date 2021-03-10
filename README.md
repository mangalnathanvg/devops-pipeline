# README.md

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


View details about Checkpoint 1 [here](https://github.ncsu.edu/cscdevops-spring2021/DEVOPS-20/blob/nrpandes/CHECKPOINT.md)

## Known issues:

While installing one of the plugin through build-pipeline-plugin, we are getting timeout issues. It runs successfully when the install is executed for the second time.

<img src="Images/Plugin_install_error.png" width="950" height="50" title="error">

We tried rectifying it with the suggested [link](https://stackoverflow.com/questions/42219781/gets-error-cannot-get-csrf-when-trying-to-install-jenkins-plugin-using-ansible/42224672#42224672)

We will try to address this issue in the next checkpoint.


## Project Board

View project board [here](https://github.ncsu.edu/cscdevops-spring2021/DEVOPS-20/projects/1)

<img src="Images/checkpoint1.png" width="650" height="650" title="cp1">

