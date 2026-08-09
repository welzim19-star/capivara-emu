#include <iostream>
#include <fstream>
#include <fcntl.h>
#include <unistd.h>
int main() {
    int fd = open("plan.md", O_RDONLY);
    std::string fdPath = "/proc/self/fd/" + std::to_string(fd);
    symlink(fdPath.c_str(), "dummy.zip");
    std::ifstream ifs("dummy.zip");
    std::string content;
    std::getline(ifs, content);
    std::cout << "Symlink Content: " << content << std::endl;
    unlink("dummy.zip");
    close(fd);
}
