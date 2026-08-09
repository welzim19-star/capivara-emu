#include <iostream>
#include <fstream>
#include <fcntl.h>
#include <unistd.h>
int main() {
    int fd = open("plan.md", O_RDONLY);
    std::string path = "/proc/self/fd/" + std::to_string(fd);
    std::ifstream ifs(path);
    std::string content;
    std::getline(ifs, content);
    std::cout << "Content: " << content << std::endl;
    close(fd);
}
